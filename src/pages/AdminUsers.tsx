import { Button, Card, Drawer, Form, Input, Select, Space, Table, Tag, App as AntApp } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { createAdminUser, listAdminUsers } from '../api/admin';
import PageHeader from '../components/PageHeader';
import { pageSizeOptions, responsePageSize } from '../utils/pagination';

type AdminUserRow = Record<string, unknown> & {
  id: React.Key;
  username?: string;
  nickname?: string;
  avatarUrl?: string;
  enabled?: boolean;
  lastLoginTime?: string;
  createdAt?: string;
};

export default function AdminUsers() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterForm] = Form.useForm();
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();

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

  const openCreate = () => {
    form.resetFields();
    setDrawerOpen(true);
  };

  const save = async (values: { username: string; password: string; nickname?: string }) => {
    setSubmitting(true);
    try {
      await createAdminUser({
        username: values.username.trim(),
        password: values.password.trim(),
        nickname: values.nickname?.trim() || '',
      });
      message.success('管理员已新增');
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
  ];

  return (
    <>
      <PageHeader
        title="管理员账号"
        description="查看后台管理员账号并新增登录账号。"
        extra={
          <Button type="primary" onClick={openCreate}>
            新增管理员
          </Button>
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
        columns={columns}
        dataSource={rows}
        scroll={{ x: 920 }}
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
      <Drawer title="新增管理员" width={520} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Form form={form} layout="vertical" onFinish={save} disabled={submitting}>
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { max: 64, message: '用户名最多 64 字' },
            ]}
          >
            <Input className="mono" maxLength={64} autoComplete="off" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, max: 64, message: '密码长度为 6-64 位' },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item label="昵称" name="nickname" rules={[{ max: 64, message: '昵称最多 64 字' }]}>
            <Input maxLength={64} showCount />
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
    </>
  );
}
