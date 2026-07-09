import {
  App as AntApp,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import {
  createKookRole,
  deleteKookRole,
  grantKookRole,
  listKookRoles,
  revokeKookRole,
  updateKookRole,
} from '../api/admin';
import PageHeader from '../components/PageHeader';
import { kookPermissionOptions, permissionBits, permissionText, permissionValue } from '../constants/kookPermissions';
import { pageSizeOptions, responsePageSize } from '../utils/pagination';

type RoleRow = Record<string, unknown> & {
  role_id?: React.Key;
  roleId?: React.Key;
  name?: string;
  color?: number;
  position?: number;
  hoist?: number;
  mentionable?: number;
  permissions?: number;
};

function roleId(row: RoleRow) {
  return String(row.role_id || row.roleId || row.id || '');
}

function roleItems(data: Record<string, unknown>) {
  return ((data.items || data.list || []) as RoleRow[]).map((item) => ({ ...item, id: roleId(item) }));
}

function meta(data: Record<string, unknown>) {
  return (data.meta || {}) as { total?: number; page?: number; page_size?: number; pageSize?: number };
}

function colorHex(value: unknown) {
  return `#${(Number(value) || 0).toString(16).padStart(6, '0').slice(-6)}`;
}

function colorNumber(value?: string) {
  if (!value) return 0;
  return parseInt(value.replace('#', ''), 16) || 0;
}

export default function KookRoles() {
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [grantTarget, setGrantTarget] = useState<RoleRow | null>(null);
  const [grantMode, setGrantMode] = useState<'grant' | 'revoke'>('grant');
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [grantForm] = Form.useForm<{ userId: string }>();
  const { message } = AntApp.useApp();

  const load = async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    try {
      const data = await listKookRoles({ page: targetPage, pageSize: targetPageSize });
      const nextMeta = meta(data);
      setRows(roleItems(data));
      setTotal(nextMeta.total || 0);
      setPage(nextMeta.page || targetPage);
      setPageSize(responsePageSize(nextMeta, targetPageSize));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = rows.filter((row) => {
    const keyword = String(filterForm.getFieldValue('keyword') || '').trim().toLowerCase();
    return !keyword || String(row.name || '').toLowerCase().includes(keyword) || String(roleId(row)).includes(keyword);
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ colorHex: '#000000', hoist: false, mentionable: false, permissions: [] });
    setDrawerOpen(true);
  };

  const openEdit = (row: RoleRow) => {
    setEditing(row);
    form.resetFields();
    form.setFieldsValue({
      name: row.name,
      colorHex: colorHex(row.color),
      hoist: Number(row.hoist) === 1,
      mentionable: Number(row.mentionable) === 1,
      permissions: permissionBits(row.permissions),
    });
    setDrawerOpen(true);
  };

  const save = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        color: colorNumber(values.colorHex as string),
        hoist: values.hoist ? 1 : 0,
        mentionable: values.mentionable ? 1 : 0,
        permissions: permissionValue(values.permissions),
      };
      if (editing) {
        await updateKookRole(roleId(editing), payload);
        message.success('KOOK 角色已更新');
      } else {
        const created = await createKookRole({ name: values.name });
        const createdRole = Array.isArray(created) ? created[0] as RoleRow | undefined : created as RoleRow;
        if (createdRole && roleId(createdRole)) {
          await updateKookRole(roleId(createdRole), payload);
        }
        message.success('KOOK 角色已创建');
      }
      setDrawerOpen(false);
      await load(editing ? page : 1);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (row: RoleRow) => {
    await deleteKookRole(roleId(row));
    message.success('KOOK 角色已删除');
    await load(1);
  };

  const openGrant = (row: RoleRow, mode: 'grant' | 'revoke') => {
    setGrantTarget(row);
    setGrantMode(mode);
    grantForm.resetFields();
  };

  const submitGrant = async () => {
    if (!grantTarget) return;
    const values = await grantForm.validateFields();
    if (grantMode === 'grant') {
      await grantKookRole(roleId(grantTarget), values.userId.trim());
      message.success('角色已授予用户');
    } else {
      await revokeKookRole(roleId(grantTarget), values.userId.trim());
      message.success('已移除用户角色');
    }
    setGrantTarget(null);
  };

  const columns: ColumnsType<RoleRow> = [
    { title: '角色 ID', width: 110, className: 'mono', render: (_, row) => roleId(row) },
    { title: '名称', dataIndex: 'name', width: 180, ellipsis: true },
    {
      title: '颜色',
      dataIndex: 'color',
      width: 110,
      render: (value) => <Tag color={colorHex(value)}>{colorHex(value)}</Tag>,
    },
    { title: '排序', dataIndex: 'position', width: 80 },
    { title: '靠前显示', dataIndex: 'hoist', width: 100, render: (v) => (Number(v) === 1 ? <Tag color="green">是</Tag> : <Tag>否</Tag>) },
    { title: '可被提及', dataIndex: 'mentionable', width: 100, render: (v) => (Number(v) === 1 ? <Tag color="green">是</Tag> : <Tag>否</Tag>) },
    { title: '权限', dataIndex: 'permissions', ellipsis: true, render: permissionText },
    {
      title: '操作',
      width: 280,
      fixed: 'right',
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => openEdit(row)}>编辑</Button>
          <Button size="small" onClick={() => openGrant(row, 'grant')}>授予</Button>
          <Button size="small" onClick={() => openGrant(row, 'revoke')}>移除</Button>
          <Popconfirm
            title="删除 KOOK 角色？"
            description={`确认删除「${row.name || roleId(row)}」吗？`}
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

  return (
    <>
      <PageHeader
        title="KOOK 角色"
        description="管理 KOOK 服务器角色、权限和成员角色绑定。"
        extra={<Button type="primary" onClick={openCreate}>创建角色</Button>}
      />
      <Card className="filter-card">
        <Form form={filterForm} layout="inline" onValuesChange={() => setRows([...rows])}>
          <Form.Item name="keyword">
            <Input.Search placeholder="角色名称 / ID" allowClear />
          </Form.Item>
          <Button onClick={() => { filterForm.resetFields(); setRows([...rows]); }}>重置</Button>
        </Form>
      </Card>
      <Table
        rowKey={(row) => String(roleId(row))}
        loading={loading}
        columns={columns}
        dataSource={filteredRows}
        scroll={{ x: 1320 }}
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
      <Drawer title={editing ? '编辑 KOOK 角色' : '创建 KOOK 角色'} width={680} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Form form={form} layout="vertical" onFinish={save} disabled={submitting}>
          <Form.Item label="角色名称" name="name">
            <Input maxLength={64} showCount placeholder={editing ? '角色名称' : '留空则由 KOOK 创建为新角色'} />
          </Form.Item>
          {editing && (
            <>
              <Form.Item label="颜色" name="colorHex">
                <Input type="color" />
              </Form.Item>
              <Form.Item label="用户列表靠前显示" name="hoist" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item label="允许被提及" name="mentionable" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item label="权限" name="permissions">
                <Select mode="multiple" allowClear options={kookPermissionOptions} optionFilterProp="label" />
              </Form.Item>
            </>
          )}
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>保存</Button>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Drawer>
      <Modal
        title={grantMode === 'grant' ? '授予用户角色' : '移除用户角色'}
        open={!!grantTarget}
        okText={grantMode === 'grant' ? '授予' : '移除'}
        okButtonProps={{ danger: grantMode === 'revoke' }}
        cancelText="取消"
        onOk={submitGrant}
        onCancel={() => setGrantTarget(null)}
      >
        <Form form={grantForm} layout="vertical">
          <Form.Item label="KOOK 用户 ID" name="userId" rules={[{ required: true, message: '请输入 KOOK 用户 ID' }]}>
            <Input className="mono" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
