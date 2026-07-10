import { Button, Card, Checkbox, Drawer, Form, Input, Modal, Select, Space, Switch, Table, Tag, App as AntApp } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { createAdminUser, listAdminUsers, listRoleMenus, updateAdminUser, updateRoleMenus } from '../api/admin';
import { ADMIN_ROLE_ADMIN, ADMIN_ROLE_KOOK_ADMIN, ADMIN_ROLE_SUPER_ADMIN } from '../auth';
import PageHeader from '../components/PageHeader';
import { useTableColumnSettings } from '../components/tableColumnSettings';
import { pageSizeOptions, responsePageSize } from '../utils/pagination';

type AdminUserRow = Record<string, unknown> & {
  id: React.Key;
  username?: string;
  nickname?: string;
  avatarUrl?: string;
  enabled?: boolean;
  role?: string;
  lastLoginTime?: string;
  createdAt?: string;
};

const roleOptions = [
  { value: ADMIN_ROLE_SUPER_ADMIN, label: '超级管理员' },
  { value: ADMIN_ROLE_KOOK_ADMIN, label: 'Kook 管理员' },
  { value: ADMIN_ROLE_ADMIN, label: '普通管理员' },
];

const roleLabel = (role?: string) => roleOptions.find((item) => item.value === role)?.label || '普通管理员';

export default function AdminUsers() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [roleMenus, setRoleMenus] = useState<{ allMenus: { key: string; label: string }[]; roles: { role: string; label: string; menuKeys: string[] }[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [roleMenuSaving, setRoleMenuSaving] = useState(false);
  const [filterForm] = Form.useForm();
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();
  const editingId = Form.useWatch('id', form);

  const load = async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    try {
      const values = filterForm.getFieldsValue();
      const res = await listAdminUsers({
        page: targetPage,
        pageSize: targetPageSize,
        keyword: values.keyword,
        sortField: values.sortField,
        sortOrder: values.sortOrder,
      });
      setRows((res.list || res.items || []) as AdminUserRow[]);
      setTotal(res.total || 0);
      setPage(targetPage);
      setPageSize(responsePageSize(res, targetPageSize));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = (row?: AdminUserRow) => {
    form.resetFields();
    form.setFieldsValue(row ? {
      id: row.id,
      username: row.username,
      nickname: row.nickname,
      enabled: row.enabled,
      role: row.role || ADMIN_ROLE_ADMIN,
    } : { role: ADMIN_ROLE_ADMIN, enabled: true });
    setDrawerOpen(true);
  };

  const save = async (values: { id?: React.Key; username: string; password?: string; nickname?: string; role?: string; enabled?: boolean }) => {
    setSubmitting(true);
    try {
      const payload = {
        password: values.password?.trim() || '',
        nickname: values.nickname?.trim() || '',
        role: values.role || ADMIN_ROLE_ADMIN,
        enabled: values.enabled ?? true,
      };
      if (values.id) {
        await updateAdminUser(values.id, payload);
        message.success('管理员已保存');
      } else {
        await createAdminUser({ username: values.username.trim(), ...payload, password: payload.password });
        message.success('管理员已新增');
      }
      setDrawerOpen(false);
      await load(1);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    filterForm.resetFields();
    setTimeout(() => load(1), 0);
  };

  const openRoleMenus = async () => {
    setRoleMenuOpen(true);
    setRoleMenus(await listRoleMenus());
  };

  const saveRoleMenus = async () => {
    if (!roleMenus) return;
    setRoleMenuSaving(true);
    try {
      await updateRoleMenus(roleMenus.roles.map(({ role, menuKeys }) => ({ role, menuKeys })));
      message.success('角色菜单已保存，当前登录账号重新登录后生效');
      setRoleMenuOpen(false);
    } finally {
      setRoleMenuSaving(false);
    }
  };

  const columns: ColumnsType<AdminUserRow> = [
    { title: 'ID', dataIndex: 'id', width: 90, className: 'mono' },
    { title: '用户名', dataIndex: 'username', width: 180, className: 'mono', ellipsis: true },
    { title: '昵称', dataIndex: 'nickname', width: 180, render: (value) => value || '-' },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 100,
      render: (value) => (value ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>),
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 120,
      render: (value) => {
        const color = value === ADMIN_ROLE_SUPER_ADMIN ? 'gold' : value === ADMIN_ROLE_KOOK_ADMIN ? 'blue' : 'default';
        return <Tag color={color}>{roleLabel(String(value || ADMIN_ROLE_ADMIN))}</Tag>;
      },
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginTime',
      width: 180,
      className: 'mono',
      render: (value) => value || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      className: 'mono',
      render: (value) => value || '-',
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right',
      render: (_, row) => <Button type="link" onClick={() => openCreate(row)}>编辑</Button>,
    },
  ];
  const tableColumns = useTableColumnSettings('admin-users', columns);

  return (
    <>
      <PageHeader
        title="管理员账号"
        description="查看后台管理员账号并分配后台权限。"
        extra={
          <Space>
            {tableColumns.button}
            <Button onClick={openRoleMenus}>角色菜单</Button>
            <Button type="primary" onClick={() => openCreate()}>
              新增管理员
            </Button>
          </Space>
        }
      />
      <Card className="filter-card">
        <Form form={filterForm} layout="inline" onFinish={() => load(1)}>
          <Form.Item name="keyword">
            <Input.Search placeholder="用户名 / 昵称" allowClear />
          </Form.Item>
          <Form.Item name="sortField">
            <Select
              placeholder="排序字段"
              allowClear
              style={{ width: 150 }}
              options={[
                { value: 'createdAt', label: '创建时间' },
                { value: 'lastLoginTime', label: '最后登录' },
                { value: 'username', label: '用户名' },
                { value: 'nickname', label: '昵称' },
                { value: 'enabled', label: '状态' },
              ]}
            />
          </Form.Item>
          <Form.Item name="sortOrder">
            <Select
              placeholder="排序"
              allowClear
              style={{ width: 120 }}
              options={[
                { value: 'desc', label: '倒序' },
                { value: 'asc', label: '正序' },
              ]}
            />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
            <Button onClick={reset}>重置</Button>
          </Space>
        </Form>
      </Card>
      <Table
        rowKey={(row) => String(row.id)}
        loading={loading}
        columns={tableColumns.columns}
        dataSource={rows}
        scroll={{ x: tableColumns.scrollX }}
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
      <Drawer title={editingId ? '编辑管理员' : '新增管理员'} width={520} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Form form={form} layout="vertical" onFinish={save} disabled={submitting}>
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }, { max: 64, message: '用户名最多 64 字' }]}
          >
            <Input className="mono" maxLength={64} autoComplete="off" disabled={Boolean(editingId)} />
          </Form.Item>
          <Form.Item
            label={editingId ? '新密码' : '密码'}
            name="password"
            rules={[
              () => ({ required: !editingId, message: '请输入密码' }),
              { min: 6, max: 64, message: '密码长度为 6-64 位' },
            ]}
          >
            <Input.Password autoComplete="new-password" placeholder={editingId ? '留空则不修改' : ''} />
          </Form.Item>
          <Form.Item label="昵称" name="nickname" rules={[{ max: 64, message: '昵称最多 64 字' }]}>
            <Input maxLength={64} showCount />
          </Form.Item>
          <Form.Item label="角色" name="role">
            <Select
              options={roleOptions}
            />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch />
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
      <Modal
        title="角色菜单"
        open={roleMenuOpen}
        onCancel={() => setRoleMenuOpen(false)}
        onOk={saveRoleMenus}
        confirmLoading={roleMenuSaving}
        width={720}
      >
        <Space direction="vertical" size={18} style={{ width: '100%' }}>
          {(roleMenus?.roles || []).map((role) => (
            <Card key={role.role} size="small" title={role.label}>
              <Checkbox.Group
                value={role.menuKeys}
                options={(roleMenus?.allMenus || []).map((menu) => ({ label: menu.label, value: menu.key }))}
                onChange={(checked) => {
                  setRoleMenus((current) => current && {
                    ...current,
                    roles: current.roles.map((item) => item.role === role.role ? { ...item, menuKeys: checked.map(String) } : item),
                  });
                }}
              />
            </Card>
          ))}
        </Space>
      </Modal>
    </>
  );
}
