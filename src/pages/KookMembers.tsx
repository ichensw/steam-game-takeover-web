import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  App as AntApp,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import {
  blacklistKookMember,
  createKookMember,
  deleteKookMember,
  getKookMember,
  listKookMembers,
  listKookRoles,
  syncKookMembers,
  unblacklistKookMember,
  updateKookMember,
} from '../api/admin';
import PageHeader from '../components/PageHeader';
import { permissionText } from '../constants/kookPermissions';
import { pageSizeOptions, responsePageSize } from '../utils/pagination';

type KookMemberRow = Record<string, unknown> & {
  id: React.Key;
  guildId?: string;
  kookUserId?: string;
  username?: string;
  nickname?: string;
  identifyNum?: string;
  avatarUrl?: string;
  isBot?: boolean;
  roleIds?: string[];
  memberStatus?: number;
  joinedAt?: string;
  exitedAt?: string;
  isBlacklisted?: boolean;
  blacklistReason?: string;
  blacklistedAt?: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
  gmtModified?: string;
  updated_at?: string;
  gmt_modified?: string;
};

type RoleRow = Record<string, unknown> & {
  role_id?: React.Key;
  roleId?: React.Key;
  name?: string;
  permissions?: number;
};

const memberStatusOptions = [
  { value: 1, label: '在服' },
  { value: 2, label: '已退出' },
];

const boolOptions = [
  { value: 'true', label: '是' },
  { value: 'false', label: '否' },
];

const renderMemberStatus = (value: unknown) =>
  Number(value) === 2 ? <Tag>已退出</Tag> : <Tag color="green">在服</Tag>;

const renderBlacklist = (value: unknown) =>
  value ? <Tag color="red">已拉黑</Tag> : <Tag color="green">正常</Tag>;

function getErrorMessage(error: unknown) {
  const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (responseMessage) return responseMessage;
  if (error instanceof Error) return error.message;
  return '操作失败';
}

function latestUpdateTime(rows: KookMemberRow[]) {
  return rows
    .map((row) => row.updatedAt || row.gmtModified || row.updated_at || row.gmt_modified)
    .filter(Boolean)
    .sort((a, b) => Date.parse(String(b)) - Date.parse(String(a)))[0];
}

function roleId(row: RoleRow) {
  return String(row.role_id || row.roleId || row.id || '');
}

function roleItems(data: Record<string, unknown>) {
  return ((data.items || data.list || []) as RoleRow[]).map((item) => ({ ...item, id: roleId(item) }));
}

export default function KookMembers() {
  const [rows, setRows] = useState<KookMemberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('');
  const [lastUpdateTime, setLastUpdateTime] = useState('');
  const [roleMap, setRoleMap] = useState<Record<string, RoleRow>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<KookMemberRow | null>(null);
  const [detail, setDetail] = useState<KookMemberRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blacklistTarget, setBlacklistTarget] = useState<KookMemberRow | null>(null);
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [blacklistForm] = Form.useForm<{ reason?: string; delMsgDays?: number }>();
  const { message } = AntApp.useApp();

  const load = async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    try {
      const values = filterForm.getFieldsValue();
      const res = await listKookMembers({
        page: targetPage,
        pageSize: targetPageSize,
        keyword: values.keyword,
        memberStatus: values.memberStatus,
        isBlacklisted: values.isBlacklisted,
        hasPermission: values.hasPermission,
      });
      const nextRows = (res.list || res.items || []) as KookMemberRow[];
      setRows(nextRows);
      setTotal(res.total || 0);
      setPage(targetPage);
      setPageSize(responsePageSize(res, targetPageSize));
      setLastUpdateTime(String(latestUpdateTime(nextRows) || ''));
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const roles = roleItems(await listKookRoles({ page: 1, pageSize: 100 }));
      setRoleMap(Object.fromEntries(roles.map((role) => [roleId(role), role])));
    } catch {
      setRoleMap({});
    }
  };

  useEffect(() => {
    load(1);
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ memberStatus: 1, isBot: false });
    setDrawerOpen(true);
  };

  const openEdit = async (id: React.Key) => {
    const row = (await getKookMember(id)) as KookMemberRow;
    setEditing(row);
    form.resetFields();
    form.setFieldsValue(row);
    setDrawerOpen(true);
  };

  const openDetail = async (id: React.Key) => {
    setDetailLoading(true);
    setDetail({ id });
    try {
      setDetail((await getKookMember(id)) as KookMemberRow);
    } finally {
      setDetailLoading(false);
    }
  };

  const roleNames = (roleIds?: string[]) => {
    if (!roleIds?.length) return '-';
    return roleIds.map((id) => roleMap[String(id)]?.name || id).join('、');
  };

  const rolePermissionValue = (roleIds?: string[]) =>
    (roleIds || []).reduce((sum, id) => sum | (Number(roleMap[String(id)]?.permissions) || 0), 0);

  const save = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      if (editing) {
        await updateKookMember(editing.id, values);
      } else {
        await createKookMember(values);
      }
      message.success('KOOK 成员已保存');
      setDrawerOpen(false);
      await load(editing ? page : 1);
    } finally {
      setSubmitting(false);
    }
  };

  const syncMembers = async () => {
    setSyncing(true);
    try {
      const res = await syncKookMembers();
      message.success(`已同步 ${res.count} 个 KOOK 成员`);
      setLastSyncTime(new Date().toLocaleString());
      await load(1);
    } finally {
      setSyncing(false);
    }
  };

  const remove = async (id: React.Key) => {
    await deleteKookMember(id);
    message.success('KOOK 成员已删除');
    await load(1);
  };

  const submitBlacklist = async () => {
    if (!blacklistTarget) return;
    const values = await blacklistForm.validateFields();
    try {
      await blacklistKookMember(blacklistTarget.id, {
        reason: values.reason || '',
        delMsgDays: values.delMsgDays || 0,
      });
      setBlacklistTarget(null);
      blacklistForm.resetFields();
      message.success('KOOK 成员已拉黑');
      await load();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const reset = () => {
    filterForm.resetFields();
    setTimeout(() => load(1), 0);
  };

  const columns: ColumnsType<KookMemberRow> = [
    { title: 'ID', dataIndex: 'id', width: 80, className: 'mono' },
    { title: 'KOOK 用户 ID', dataIndex: 'kookUserId', width: 160, className: 'mono', ellipsis: true },
    { title: '用户名', dataIndex: 'username', width: 140, ellipsis: true },
    { title: '昵称', dataIndex: 'nickname', width: 140, ellipsis: true },
    { title: '认证号', dataIndex: 'identifyNum', width: 100, className: 'mono' },
    { title: '机器人', dataIndex: 'isBot', width: 90, render: (v) => (v ? <Tag>是</Tag> : <Tag>否</Tag>) },
    { title: '角色', dataIndex: 'roleIds', width: 220, ellipsis: true, render: roleNames },
    { title: '拥有权限', dataIndex: 'roleIds', width: 260, ellipsis: true, render: (ids) => permissionText(rolePermissionValue(ids as string[] | undefined)) },
    { title: '成员状态', dataIndex: 'memberStatus', width: 100, render: renderMemberStatus },
    { title: '黑名单', dataIndex: 'isBlacklisted', width: 100, render: renderBlacklist },
    { title: '加入时间', dataIndex: 'joinedAt', width: 170, className: 'mono', render: (v) => v || '-' },
    { title: '退出时间', dataIndex: 'exitedAt', width: 170, className: 'mono', render: (v) => v || '-' },
    {
      title: '操作',
      width: 260,
      fixed: 'right',
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => openDetail(row.id)}>
            详情
          </Button>
          <Button size="small" onClick={() => openEdit(row.id)}>
            编辑
          </Button>
          {row.isBlacklisted ? (
            <Popconfirm
              title="解除 KOOK 拉黑"
              description="确认从 KOOK 黑名单移除该成员？"
              okText="解除"
              cancelText="取消"
              onConfirm={async () => {
                try {
                  await unblacklistKookMember(row.id);
                  message.success('KOOK 成员已解除拉黑');
                  await load();
                } catch (error) {
                  message.error(getErrorMessage(error));
                }
              }}
            >
              <Button size="small">解除</Button>
            </Popconfirm>
          ) : (
            <Button size="small" danger onClick={() => setBlacklistTarget(row)}>
              拉黑
            </Button>
          )}
          <Popconfirm title="删除 KOOK 成员？" okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => remove(row.id)}>
            <Button size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="KOOK 成员"
        description="同步、查询和维护 KOOK 服务器成员及黑名单状态。"
        extra={
          <Space>
            <Button onClick={syncMembers} loading={syncing}>
              同步 KOOK 成员
            </Button>
            <Button type="primary" onClick={openCreate}>
              新增成员
            </Button>
          </Space>
        }
      />
      <Card className="filter-card">
        <Form form={filterForm} layout="inline" onFinish={() => load(1)}>
          <Form.Item name="keyword">
            <Input.Search placeholder="用户 ID / 用户名 / 昵称 / 认证号" allowClear />
          </Form.Item>
          <Form.Item name="memberStatus">
            <Select placeholder="成员状态" allowClear style={{ width: 130 }} options={memberStatusOptions} />
          </Form.Item>
          <Form.Item name="isBlacklisted">
            <Select placeholder="黑名单" allowClear style={{ width: 120 }} options={boolOptions} />
          </Form.Item>
          <Form.Item name="hasPermission">
            <Select placeholder="是否有权限" allowClear style={{ width: 140 }} options={boolOptions} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
            <Button onClick={reset}>重置</Button>
          </Space>
        </Form>
      </Card>
      <Typography.Paragraph type="secondary">
        最近更新时间：{lastUpdateTime || (lastSyncTime ? `同步完成时间 ${lastSyncTime}` : '暂无')}
      </Typography.Paragraph>
      <Table
        rowKey={(row) => String(row.id)}
        loading={loading}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 1960 }}
        pagination={{
          total,
          current: page,
          pageSize,
          pageSizeOptions,
          showSizeChanger: true,
          onChange: load,
          showTotal: (n) => `共 ${n} 条`,
        }}
      />
      <Drawer
        title={editing ? '编辑 KOOK 成员' : '新增 KOOK 成员'}
        width={620}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Form form={form} layout="vertical" onFinish={save} disabled={submitting}>
          <Form.Item label="KOOK 服务器 ID" name="guildId" rules={[{ required: !editing, message: '请输入 KOOK 服务器 ID' }]}>
            <Input className="mono" disabled={!!editing} maxLength={64} />
          </Form.Item>
          <Form.Item label="KOOK 用户 ID" name="kookUserId" rules={[{ required: !editing, message: '请输入 KOOK 用户 ID' }]}>
            <Input className="mono" disabled={!!editing} maxLength={64} />
          </Form.Item>
          <Form.Item label="用户名" name="username">
            <Input maxLength={64} showCount />
          </Form.Item>
          <Form.Item label="昵称" name="nickname">
            <Input maxLength={64} showCount />
          </Form.Item>
          <Form.Item label="认证号" name="identifyNum">
            <Input className="mono" maxLength={16} showCount />
          </Form.Item>
          <Form.Item label="头像 URL" name="avatarUrl">
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item label="是否机器人" name="isBot">
            <Select options={[{ value: false, label: '否' }, { value: true, label: '是' }]} />
          </Form.Item>
          <Form.Item label="成员状态" name="memberStatus">
            <Select options={memberStatusOptions} />
          </Form.Item>
          <Form.Item label="加入时间" name="joinedAt" extra="格式：YYYY-MM-DD HH:mm:ss">
            <Input className="mono" placeholder="2026-07-08 10:00:00" />
          </Form.Item>
          <Form.Item label="退出时间" name="exitedAt" extra="格式：YYYY-MM-DD HH:mm:ss">
            <Input className="mono" placeholder="2026-07-08 10:00:00" />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} maxLength={255} showCount />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              保存
            </Button>
            <Button onClick={() => setDrawerOpen(false)} disabled={submitting}>
              取消
            </Button>
          </Space>
        </Form>
      </Drawer>
      <Drawer
        title="KOOK 成员详情"
        width={620}
        open={!!detail}
        onClose={() => setDetail(null)}
        loading={detailLoading}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID"><span className="mono">{detail.id}</span></Descriptions.Item>
            <Descriptions.Item label="服务器 ID"><span className="mono">{detail.guildId || '-'}</span></Descriptions.Item>
            <Descriptions.Item label="KOOK 用户 ID"><span className="mono">{detail.kookUserId || '-'}</span></Descriptions.Item>
            <Descriptions.Item label="用户名">{detail.username || '-'}</Descriptions.Item>
            <Descriptions.Item label="昵称">{detail.nickname || '-'}</Descriptions.Item>
            <Descriptions.Item label="认证号"><span className="mono">{detail.identifyNum || '-'}</span></Descriptions.Item>
            <Descriptions.Item label="机器人">{detail.isBot ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="角色">{roleNames(detail.roleIds)}</Descriptions.Item>
            <Descriptions.Item label="拥有权限">{permissionText(rolePermissionValue(detail.roleIds))}</Descriptions.Item>
            <Descriptions.Item label="成员状态">{renderMemberStatus(detail.memberStatus)}</Descriptions.Item>
            <Descriptions.Item label="黑名单">{renderBlacklist(detail.isBlacklisted)}</Descriptions.Item>
            <Descriptions.Item label="拉黑原因">{detail.blacklistReason || '-'}</Descriptions.Item>
            <Descriptions.Item label="拉黑时间"><span className="mono">{detail.blacklistedAt || '-'}</span></Descriptions.Item>
            <Descriptions.Item label="加入时间"><span className="mono">{detail.joinedAt || '-'}</span></Descriptions.Item>
            <Descriptions.Item label="退出时间"><span className="mono">{detail.exitedAt || '-'}</span></Descriptions.Item>
            <Descriptions.Item label="备注">{detail.remark || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
      <Modal
        title="拉黑 KOOK 成员"
        open={!!blacklistTarget}
        okText="确认拉黑"
        okButtonProps={{ danger: true }}
        cancelText="取消"
        onOk={submitBlacklist}
        onCancel={() => {
          setBlacklistTarget(null);
          blacklistForm.resetFields();
        }}
      >
        <Form form={blacklistForm} layout="vertical">
          <Form.Item label="拉黑原因" name="reason" rules={[{ max: 255, message: '拉黑原因最多 255 字' }]}>
            <Input.TextArea rows={4} placeholder="选填，会同步给 KOOK 黑名单备注" showCount maxLength={255} />
          </Form.Item>
          <Form.Item label="删除消息天数" name="delMsgDays" initialValue={0}>
            <InputNumber min={0} max={7} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
