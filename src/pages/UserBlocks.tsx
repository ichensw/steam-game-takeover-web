import {
  Alert,
  Avatar,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
  App as AntApp,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createUserBlock,
  deleteUserBlock,
  listUserBlocks,
  listUsers,
  updateUserBlock,
} from '../api/admin';
import PageHeader from '../components/PageHeader';
import { useTableColumnSettings } from '../components/tableColumnSettings';
import { pageSizeOptions, responsePageSize } from '../utils/pagination';

type WXUser = {
  id?: React.Key;
  nickname?: string;
  openid?: string;
  steamId?: string;
  avatarUrl?: string;
};

type UserBlockRow = Record<string, unknown> & {
  id: React.Key;
  ownerUserId?: React.Key;
  blockedUserId?: React.Key;
  ownerUser?: WXUser;
  blockedUser?: WXUser;
  createdAt?: string;
  updatedAt?: string;
};

type UserOption = {
  value: number;
  label: string;
  disabled?: boolean;
};

type UserBlockFormValues = {
  ownerUserId: React.Key;
  blockedUserId: React.Key;
};

function numericUserId(value: unknown) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

function displayName(user?: WXUser) {
  const name = user?.nickname?.trim();
  return name || '未命名用户';
}

function userFullLabel(user?: WXUser) {
  if (!user) return '-';
  const parts = [
    displayName(user),
    user.steamId ? `SteamID: ${user.steamId}` : '',
    user.openid ? `openid: ${user.openid}` : '',
    user.id ? `ID: ${user.id}` : '',
  ].filter(Boolean);
  return parts.join(' / ') || '-';
}

function userOption(row: WXUser): UserOption | null {
  const id = numericUserId(row.id);
  if (!id) return null;
  return { value: id, label: userFullLabel(row) };
}

function optionLabel(options: UserOption[], value: unknown) {
  const id = numericUserId(value);
  return options.find((option) => option.value === id)?.label || (id ? `用户 ID: ${id}` : '');
}

function renderUser(user?: WXUser) {
  const label = userFullLabel(user);
  const name = displayName(user);
  const id = user?.id || '-';
  const secondary = user?.steamId || user?.openid || '-';
  return (
    <Tooltip title={label}>
      <Space size={8} style={{ maxWidth: '100%' }}>
        <Avatar size={30} src={user?.avatarUrl}>
          {name.slice(0, 1)}
        </Avatar>
        <span style={{ minWidth: 0 }}>
          <Typography.Text strong ellipsis style={{ display: 'block', maxWidth: 220 }}>
            {name}
          </Typography.Text>
          <Typography.Text type="secondary" className="mono" ellipsis style={{ display: 'block', maxWidth: 220 }}>
            ID {id} · {secondary}
          </Typography.Text>
        </span>
      </Space>
    </Tooltip>
  );
}

export default function UserBlocks() {
  const [rows, setRows] = useState<UserBlockRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<UserBlockRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  const [filterForm] = Form.useForm();
  const [editorForm] = Form.useForm<UserBlockFormValues>();
  const userSearchTimer = useRef<number | undefined>(undefined);
  const { message } = AntApp.useApp();
  const ownerUserId = Form.useWatch('ownerUserId', editorForm);
  const blockedUserId = Form.useWatch('blockedUserId', editorForm);

  const rememberUsers = (users: (WXUser | undefined)[]) => {
    const nextOptions = users
      .filter((user): user is WXUser => Boolean(user))
      .map(userOption)
      .filter((option): option is UserOption => Boolean(option));
    if (!nextOptions.length) return;
    setUserOptions((current) => {
      const map = new Map<number, UserOption>();
      nextOptions.forEach((option) => map.set(option.value, option));
      current.forEach((option) => {
        if (!map.has(option.value)) map.set(option.value, option);
      });
      return Array.from(map.values());
    });
  };

  const searchUsers = async (keyword = '') => {
    setUserSearching(true);
    try {
      const res = await listUsers({ page: 1, pageSize: 20, keyword });
      const nextOptions = ((res.list || res.items || []) as WXUser[])
        .map(userOption)
        .filter((option): option is UserOption => Boolean(option));
      setUserOptions((current) => {
        const map = new Map<number, UserOption>();
        nextOptions.forEach((option) => map.set(option.value, option));
        current.forEach((option) => {
          if (!map.has(option.value)) map.set(option.value, option);
        });
        return Array.from(map.values());
      });
    } finally {
      setUserSearching(false);
    }
  };

  const debouncedSearchUsers = (keyword: string) => {
    window.clearTimeout(userSearchTimer.current);
    userSearchTimer.current = window.setTimeout(() => searchUsers(keyword), 300);
  };

  const buildParams = (targetPage: number, targetPageSize: number) => {
    const values = filterForm.getFieldsValue();
    return {
      page: targetPage,
      pageSize: targetPageSize,
      keyword: values.keyword,
      ownerUserId: values.ownerUserId,
      blockedUserId: values.blockedUserId,
    };
  };

  const load = async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    try {
      const res = await listUserBlocks(buildParams(targetPage, targetPageSize));
      const list = (res.list || res.items || []) as UserBlockRow[];
      setRows(list);
      setTotal(res.total || 0);
      setPage(targetPage);
      setPageSize(responsePageSize(res, targetPageSize));
      rememberUsers(list.flatMap((row) => [row.ownerUser, row.blockedUser]));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    searchUsers();
    return () => window.clearTimeout(userSearchTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    editorForm.resetFields();
    setEditorOpen(true);
    searchUsers();
  };

  const openEdit = (row: UserBlockRow) => {
    setEditing(row);
    rememberUsers([row.ownerUser, row.blockedUser]);
    editorForm.setFieldsValue({
      ownerUserId: numericUserId(row.ownerUserId || row.ownerUser?.id),
      blockedUserId: numericUserId(row.blockedUserId || row.blockedUser?.id),
    });
    setEditorOpen(true);
  };

  const save = async (values: UserBlockFormValues) => {
    setSaving(true);
    try {
      const payload = {
        ownerUserId: numericUserId(values.ownerUserId),
        blockedUserId: numericUserId(values.blockedUserId),
      };
      if (editing) {
        await updateUserBlock(editing.id, payload);
        message.success('拉黑关系已保存');
        await load(page, pageSize);
      } else {
        await createUserBlock(payload);
        message.success('拉黑关系已新增');
        await load(1, pageSize);
      }
      setEditorOpen(false);
      setEditing(null);
      editorForm.resetFields();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: UserBlockRow) => {
    try {
      await deleteUserBlock(row.id);
      message.success('拉黑关系已删除');
      await load(rows.length === 1 && page > 1 ? page - 1 : page, pageSize);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const reset = () => {
    filterForm.resetFields();
    setTimeout(() => load(1), 0);
  };

  const ownerOptions = useMemo(
    () => userOptions.map((option) => ({ ...option, disabled: option.value === numericUserId(blockedUserId) })),
    [blockedUserId, userOptions],
  );
  const blockedOptions = useMemo(
    () => userOptions.map((option) => ({ ...option, disabled: option.value === numericUserId(ownerUserId) })),
    [ownerUserId, userOptions],
  );

  const userSelectProps = {
    allowClear: true,
    filterOption: false,
    loading: userSearching,
    onFocus: () => searchUsers(),
    onSearch: debouncedSearchUsers,
    optionFilterProp: 'label',
    showSearch: true,
    style: { width: '100%' },
  };

  const columns: ColumnsType<UserBlockRow> = [
    { title: '关系ID', dataIndex: 'id', width: 100, className: 'mono' },
    {
      title: '发起拉黑用户',
      dataIndex: 'ownerUser',
      width: 280,
      render: (_, row) => renderUser(row.ownerUser),
    },
    {
      title: '被拉黑用户',
      dataIndex: 'blockedUser',
      width: 280,
      render: (_, row) => renderUser(row.blockedUser),
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 180, className: 'mono' },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180, className: 'mono' },
    {
      title: '操作',
      width: 150,
      fixed: 'right',
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => openEdit(row)}>
            编辑
          </Button>
          <Popconfirm
            title="删除拉黑关系"
            description="确认删除这条拉黑关系？"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => remove(row)}
          >
            <Button size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  const tableColumns = useTableColumnSettings('user-blocks', columns);

  const selectedOwnerLabel = optionLabel(userOptions, ownerUserId);
  const selectedBlockedLabel = optionLabel(userOptions, blockedUserId);
  const showRelationPreview = numericUserId(ownerUserId) > 0
    && numericUserId(blockedUserId) > 0
    && numericUserId(ownerUserId) !== numericUserId(blockedUserId);

  return (
    <>
      <PageHeader
        title="用户拉黑关系"
        description="管理小程序用户之间的拉黑关系。"
        extra={
          <Space>
            {tableColumns.button}
            <Button type="primary" onClick={openCreate}>
              新增拉黑关系
            </Button>
          </Space>
        }
      />
      <Card className="filter-card">
        <Form form={filterForm} layout="inline" onFinish={() => load(1)}>
          <Form.Item name="keyword">
            <Input.Search placeholder="昵称 / openid / SteamID" allowClear />
          </Form.Item>
          <Form.Item name="ownerUserId">
            <Select
              {...userSelectProps}
              options={userOptions}
              placeholder="发起拉黑用户"
              style={{ width: 220 }}
            />
          </Form.Item>
          <Form.Item name="blockedUserId">
            <Select
              {...userSelectProps}
              options={userOptions}
              placeholder="被拉黑用户"
              style={{ width: 220 }}
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
        onChange={(pagination: TablePaginationConfig) => load(pagination.current || 1, pagination.pageSize || pageSize)}
        scroll={{ x: tableColumns.scrollX }}
        pagination={{
          total,
          current: page,
          pageSize,
          pageSizeOptions,
          showSizeChanger: true,
          showTotal: (n) => `共 ${n} 条`,
        }}
      />
      <Modal
        title={editing ? '编辑拉黑关系' : '新增拉黑关系'}
        open={editorOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        onCancel={() => {
          setEditorOpen(false);
          setEditing(null);
          editorForm.resetFields();
        }}
        onOk={() => editorForm.submit()}
      >
        <Form form={editorForm} layout="vertical" onFinish={save}>
          <Form.Item
            label="发起拉黑用户"
            name="ownerUserId"
            dependencies={['blockedUserId']}
            rules={[
              { required: true, message: '请选择发起拉黑用户' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (value && value === getFieldValue('blockedUserId')) {
                    return Promise.reject(new Error('不能选择同一个用户'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <Select
              {...userSelectProps}
              options={ownerOptions}
              placeholder="搜索昵称 / SteamID / openid / 用户ID"
            />
          </Form.Item>
          <Form.Item
            label="被拉黑用户"
            name="blockedUserId"
            dependencies={['ownerUserId']}
            rules={[
              { required: true, message: '请选择被拉黑用户' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (value && value === getFieldValue('ownerUserId')) {
                    return Promise.reject(new Error('不能选择同一个用户'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <Select
              {...userSelectProps}
              options={blockedOptions}
              placeholder="搜索昵称 / SteamID / openid / 用户ID"
            />
          </Form.Item>
          {showRelationPreview && (
            <Alert
              type="info"
              showIcon
              message={`${selectedOwnerLabel} 将拉黑 ${selectedBlockedLabel}`}
            />
          )}
        </Form>
      </Modal>
    </>
  );
}
