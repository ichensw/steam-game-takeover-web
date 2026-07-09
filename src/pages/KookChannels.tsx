import {
  App as AntApp,
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
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import {
  createKookChannel,
  createKookChannelRole,
  deleteKookChannel,
  deleteKookChannelRole,
  getKookChannel,
  getKookChannelRoles,
  kickoutKookChannelUser,
  listKookChannelUsers,
  listKookChannels,
  moveKookChannelUsers,
  syncKookChannelRoles,
  updateKookChannel,
  updateKookChannelRole,
} from '../api/admin';
import PageHeader from '../components/PageHeader';

type Row = Record<string, unknown> & {
  id: React.Key;
  name?: string;
  type?: number;
  parent_id?: string;
  parentId?: string;
  level?: number;
  limit_amount?: number;
  limitAmount?: number;
};

type UserRow = Record<string, unknown> & {
  id: React.Key;
  username?: string;
  nickname?: string;
  identify_num?: string;
  bot?: boolean;
};

type RoleRow = Record<string, unknown> & {
  role_id?: React.Key;
  user_id?: React.Key;
  user?: { id?: React.Key };
  allow?: number;
  deny?: number;
};

const channelTypeOptions = [
  { value: 0, label: '分组' },
  { value: 1, label: '文字' },
  { value: 2, label: '语音' },
];

const voiceQualityOptions = [
  { value: '1', label: '流畅' },
  { value: '2', label: '正常' },
  { value: '3', label: '高质量' },
];

const roleTypeOptions = [
  { value: 'user_id', label: '用户' },
  { value: 'role_id', label: '角色' },
];

function channelItems(data: Record<string, unknown>) {
  return ((data.items || data.list || []) as Row[]).map((item) => ({
    ...item,
    id: String(item.id || item.channel_id || item.channelId),
  }));
}

function meta(data: Record<string, unknown>) {
  return (data.meta || {}) as { total?: number; page?: number; page_size?: number; pageSize?: number };
}

function channelType(value: unknown) {
  const type = Number(value);
  if (type === 0) return <Tag>分组</Tag>;
  if (type === 2) return <Tag color="blue">语音</Tag>;
  return <Tag color="green">文字</Tag>;
}

function rowName(row: Row) {
  return row.name || String(row.id || '-');
}

function roleKey(row: RoleRow, index?: number) {
  return String(row.role_id || row.user_id || row.user?.id || index);
}

function getErrorMessage(error: unknown) {
  const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (responseMessage) return responseMessage;
  if (error instanceof Error) return error.message;
  return '操作失败';
}

export default function KookChannels() {
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [usersTarget, setUsersTarget] = useState<Row | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [rolesTarget, setRolesTarget] = useState<Row | null>(null);
  const [roles, setRoles] = useState<Record<string, unknown> | null>(null);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [moveForm] = Form.useForm<{ userIds: string }>();
  const [roleForm] = Form.useForm();
  const { message, modal } = AntApp.useApp();

  const load = async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    try {
      const filters = filterForm.getFieldsValue();
      const data = await listKookChannels({
        page: targetPage,
        pageSize: targetPageSize,
        type: filters.type,
        parentId: filters.parentId,
      });
      const nextMeta = meta(data);
      setRows(channelItems(data));
      setTotal(nextMeta.total || 0);
      setPage(nextMeta.page || targetPage);
      setPageSize(nextMeta.page_size || nextMeta.pageSize || targetPageSize);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: 1, voiceQuality: '2', limitAmount: 0 });
    setDrawerOpen(true);
  };

  const openEdit = async (row: Row) => {
    const data = await getKookChannel(row.id, { needChildren: true });
    setEditing({ ...row, ...data, id: row.id });
    form.resetFields();
    form.setFieldsValue({
      name: data.name,
      parentId: data.parent_id || data.parentId,
      topic: data.topic,
      level: data.level,
      slowMode: data.slow_mode,
      limitAmount: data.limit_amount,
      voiceQuality: data.voice_quality,
      password: '',
    });
    setDrawerOpen(true);
  };

  const save = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      const payload = { ...values };
      if (payload.type === 0) {
        payload.isCategory = 1;
        delete payload.type;
      } else {
        delete payload.isCategory;
      }
      if (editing) {
        await updateKookChannel(editing.id, payload);
        message.success('频道已更新');
      } else {
        await createKookChannel(payload);
        message.success('频道已创建');
      }
      setDrawerOpen(false);
      await load(editing ? page : 1);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Row) => {
    await deleteKookChannel(row.id);
    message.success('频道已删除');
    await load(1);
  };

  const openDetail = async (row: Row) => {
    setDetail({ id: row.id });
    setDetail(await getKookChannel(row.id, { needChildren: true }));
  };

  const openUsers = async (row: Row) => {
    setUsersTarget(row);
    setUsersLoading(true);
    try {
      setUsers((await listKookChannelUsers(row.id)) as UserRow[]);
    } finally {
      setUsersLoading(false);
    }
  };

  const moveUsers = async () => {
    if (!usersTarget) return;
    const values = await moveForm.validateFields();
    const userIds = values.userIds.split(/[\s,，]+/).map((id) => id.trim()).filter(Boolean);
    await moveKookChannelUsers(usersTarget.id, userIds);
    moveForm.resetFields();
    message.success('用户已移动到该语音频道');
    await openUsers(usersTarget);
  };

  const kickUser = async (userId: React.Key) => {
    if (!usersTarget) return;
    await kickoutKookChannelUser(usersTarget.id, String(userId));
    message.success('用户已踢出语音频道');
    await openUsers(usersTarget);
  };

  const openRoles = async (row: Row) => {
    setRolesTarget(row);
    setRolesLoading(true);
    roleForm.resetFields();
    roleForm.setFieldsValue({ type: 'user_id', allow: 0, deny: 0 });
    try {
      setRoles(await getKookChannelRoles(row.id));
    } finally {
      setRolesLoading(false);
    }
  };

  const refreshRoles = async () => {
    if (!rolesTarget) return;
    setRolesLoading(true);
    try {
      setRoles(await getKookChannelRoles(rolesTarget.id));
    } finally {
      setRolesLoading(false);
    }
  };

  const submitRole = async (update = false) => {
    if (!rolesTarget) return;
    const values = await roleForm.validateFields();
    if (update) {
      await updateKookChannelRole(rolesTarget.id, values);
      message.success('权限已更新');
    } else {
      await createKookChannelRole(rolesTarget.id, values);
      message.success('权限已创建');
    }
    await refreshRoles();
  };

  const deleteRole = async (row: RoleRow) => {
    if (!rolesTarget) return;
    const isRole = row.role_id !== undefined;
    await deleteKookChannelRole(rolesTarget.id, {
      type: isRole ? 'role_id' : 'user_id',
      value: String(isRole ? row.role_id : row.user?.id || row.user_id),
    });
    message.success('权限已删除');
    await refreshRoles();
  };

  const syncRoles = async () => {
    if (!rolesTarget) return;
    await syncKookChannelRoles(rolesTarget.id);
    message.success('已同步分组权限');
    await refreshRoles();
  };

  const columns: ColumnsType<Row> = [
    { title: '频道 ID', dataIndex: 'id', width: 170, className: 'mono', ellipsis: true },
    { title: '名称', dataIndex: 'name', width: 180, ellipsis: true },
    { title: '类型', dataIndex: 'type', width: 90, render: channelType },
    {
      title: '父分组 ID',
      width: 170,
      className: 'mono',
      render: (_, row) => row.parent_id || row.parentId || '-',
    },
    { title: '排序', dataIndex: 'level', width: 90 },
    { title: '人数限制', width: 100, render: (_, row) => row.limit_amount || row.limitAmount || '-' },
    {
      title: '操作',
      width: 340,
      fixed: 'right',
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => openDetail(row)}>详情</Button>
          <Button size="small" onClick={() => openEdit(row)}>编辑</Button>
          {Number(row.type) === 2 && <Button size="small" onClick={() => openUsers(row)}>语音成员</Button>}
          <Button size="small" onClick={() => openRoles(row)}>权限</Button>
          <Popconfirm
            title="删除 KOOK 频道？"
            description={`确认删除「${rowName(row)}」吗？`}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => remove(row)}
          >
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const userColumns: ColumnsType<UserRow> = [
    { title: '用户 ID', dataIndex: 'id', width: 150, className: 'mono', ellipsis: true },
    { title: '用户名', dataIndex: 'username', width: 140, ellipsis: true },
    { title: '昵称', dataIndex: 'nickname', width: 140, ellipsis: true },
    { title: '认证号', dataIndex: 'identify_num', width: 100, className: 'mono' },
    { title: '机器人', dataIndex: 'bot', width: 90, render: (v) => (v ? <Tag>是</Tag> : <Tag>否</Tag>) },
    {
      title: '操作',
      width: 100,
      render: (_, row) => (
        <Popconfirm title="踢出语音频道？" okText="踢出" cancelText="取消" onConfirm={() => kickUser(row.id)}>
          <Button size="small" danger>踢出</Button>
        </Popconfirm>
      ),
    },
  ];

  const roleColumns: ColumnsType<RoleRow> = [
    {
      title: '对象',
      width: 160,
      render: (_, row) => row.role_id !== undefined ? `角色 ${row.role_id}` : `用户 ${row.user?.id || row.user_id || '-'}`,
    },
    { title: '允许值', dataIndex: 'allow', width: 100 },
    { title: '拒绝值', dataIndex: 'deny', width: 100 },
    {
      title: '操作',
      width: 100,
      render: (_, row) => (
        <Button size="small" danger onClick={() => modal.confirm({
          title: '删除权限规则？',
          content: '确认删除这条 KOOK 频道权限规则吗？',
          okText: '删除',
          cancelText: '取消',
          okButtonProps: { danger: true },
          onOk: () => deleteRole(row).catch((error) => message.error(getErrorMessage(error))),
        })}>
          删除
        </Button>
      ),
    },
  ];

  const roleRows = [
    ...((roles?.permission_overwrites || []) as RoleRow[]),
    ...((roles?.permission_users || []) as RoleRow[]),
  ];

  return (
    <>
      <PageHeader
        title="KOOK 频道"
        description="管理 KOOK 频道、语音成员移动和频道权限。"
        extra={<Button type="primary" onClick={openCreate}>创建频道</Button>}
      />

      <Card className="filter-card">
        <Form form={filterForm} layout="inline" onFinish={() => load(1)}>
          <Form.Item name="type">
            <Select placeholder="频道类型" allowClear style={{ width: 130 }} options={channelTypeOptions} />
          </Form.Item>
          <Form.Item name="parentId">
            <Input placeholder="父分组 ID" allowClear className="mono" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">查询</Button>
            <Button onClick={() => { filterForm.resetFields(); setTimeout(() => load(1), 0); }}>重置</Button>
          </Space>
        </Form>
      </Card>

      <Table
        rowKey={(row) => String(row.id)}
        loading={loading}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 1180 }}
        pagination={{
          total,
          current: page,
          pageSize,
          showSizeChanger: true,
          onChange: load,
          showTotal: (n) => `共 ${n} 条`,
        }}
      />

      <Drawer title={editing ? '编辑 KOOK 频道' : '创建 KOOK 频道'} width={620} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Form form={form} layout="vertical" disabled={saving} onFinish={save}>
          {!editing && (
            <Form.Item label="频道类型" name="type" rules={[{ required: true, message: '请选择频道类型' }]}>
              <Select options={channelTypeOptions} />
            </Form.Item>
          )}
          <Form.Item label="频道名称" name="name" rules={[{ required: !editing, message: '请输入频道名称' }]}>
            <Input maxLength={64} showCount />
          </Form.Item>
          <Form.Item label="父分组 ID" name="parentId">
            <Input className="mono" placeholder="留空则不放入分组，编辑时填 0 可移出分组" />
          </Form.Item>
          <Form.Item label="频道简介" name="topic">
            <Input.TextArea rows={3} maxLength={255} showCount />
          </Form.Item>
          <Form.Item label="排序" name="level">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="慢速模式 ms" name="slowMode">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="语音人数限制" name="limitAmount">
            <InputNumber min={0} max={99} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="语音质量" name="voiceQuality">
            <Select allowClear options={voiceQualityOptions} />
          </Form.Item>
          {editing && (
            <Form.Item label="语音密码" name="password">
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          )}
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>保存</Button>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Drawer>

      <Drawer title="频道详情" width={680} open={!!detail} onClose={() => setDetail(null)}>
        {detail && (
          <Descriptions column={1} bordered size="small">
            {Object.entries(detail).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {typeof value === 'object' ? <pre>{JSON.stringify(value, null, 2)}</pre> : String(value ?? '-')}
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </Drawer>

      <Drawer title={`语音成员 - ${usersTarget ? rowName(usersTarget) : ''}`} width={760} open={!!usersTarget} onClose={() => setUsersTarget(null)}>
        <Form form={moveForm} layout="inline" onFinish={moveUsers}>
          <Form.Item name="userIds" rules={[{ required: true, message: '请输入用户 ID' }]}>
            <Input placeholder="用户 ID，多个用逗号或空格分隔" style={{ width: 320 }} />
          </Form.Item>
          <Button type="primary" htmlType="submit">移动到当前频道</Button>
        </Form>
        <Table
          style={{ marginTop: 16 }}
          rowKey={(row) => String(row.id)}
          loading={usersLoading}
          columns={userColumns}
          dataSource={users}
          pagination={false}
          scroll={{ x: 760 }}
        />
      </Drawer>

      <Modal
        title={`频道权限 - ${rolesTarget ? rowName(rolesTarget) : ''}`}
        open={!!rolesTarget}
        onCancel={() => setRolesTarget(null)}
        footer={null}
        width={820}
      >
        <Tabs
          items={[
            {
              key: 'list',
              label: '权限列表',
              children: (
                <>
                  <Space style={{ marginBottom: 12 }}>
                    <Button onClick={refreshRoles} loading={rolesLoading}>刷新</Button>
                    <Button onClick={syncRoles}>同步分组权限</Button>
                    <Typography.Text type="secondary">同步状态：{String(roles?.permission_sync ?? '-')}</Typography.Text>
                  </Space>
                  <Table
                    rowKey={roleKey}
                    loading={rolesLoading}
                    columns={roleColumns}
                    dataSource={roleRows}
                    pagination={false}
                  />
                </>
              ),
            },
            {
              key: 'edit',
              label: '创建/更新',
              children: (
                <Form form={roleForm} layout="vertical">
                  <Form.Item label="对象类型" name="type" rules={[{ required: true, message: '请选择对象类型' }]}>
                    <Select options={roleTypeOptions} />
                  </Form.Item>
                  <Form.Item label="对象 ID" name="value" rules={[{ required: true, message: '请输入用户或角色 ID' }]}>
                    <Input className="mono" />
                  </Form.Item>
                  <Form.Item label="允许权限值" name="allow">
                    <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item label="拒绝权限值" name="deny">
                    <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                  </Form.Item>
                  <Space>
                    <Button type="primary" onClick={() => submitRole(false)}>创建</Button>
                    <Button onClick={() => submitRole(true)}>更新</Button>
                  </Space>
                </Form>
              ),
            },
          ]}
        />
      </Modal>
    </>
  );
}
