import {
  App as AntApp,
  Button,
  Card,
  Checkbox,
  DatePicker,
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
  Tooltip,
  Typography,
} from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, ScheduleOutlined, SettingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import {
  createKookChannel,
  createKookChannelRole,
  deleteKookChannel,
  deleteKookChannelRole,
  getKookChannel,
  getKookChannelRoles,
  kickoutKookChannelUser,
  listKookChannelUsageSummary,
  type KookChannelUsage,
  listKookChannelUsers,
  listKookChannels,
  moveKookChannelUsers,
  syncKookChannelRoles,
  updateKookChannel,
  updateKookChannelRole,
} from '../api/admin';
import KookMemberSelect from '../components/KookMemberSelect';
import KookRoleSelect from '../components/KookRoleSelect';
import KookChannelSortDrawer from '../components/KookChannelSortDrawer';
import PageHeader from '../components/PageHeader';
import { useTableColumnSettings } from '../components/tableColumnSettings';
import { kookPermissionOptions, permissionText, permissionValue } from '../constants/kookPermissions';

type Row = Record<string, unknown> & {
  id: React.Key;
  name?: string;
  type?: number;
  parent_id?: string;
  parentId?: string;
  level?: number;
  limit_amount?: number;
  limitAmount?: number;
  durationSeconds?: number;
  durationText?: string;
  sessionCount?: number;
  activeUserCount?: number;
  children?: Row[];
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

type DateLike = { format: (template: string) => string };
type ColumnKey = 'id' | 'name' | 'type' | 'activeUserCount' | 'durationSeconds' | 'sessionCount' | 'level' | 'limitAmount';
type ColumnWidths = Partial<Record<ColumnKey, number>>;
type ColumnPreference = { order: ColumnKey[]; visible: ColumnKey[]; widths: ColumnWidths };
type ColumnDefinition = {
  key: ColumnKey;
  title: string;
  defaultVisible: boolean;
  column: ColumnsType<Row>[number];
};

const dateTimeFormat = 'YYYY-MM-DD HH:mm:ss';
const columnPreferenceKey = 'ttw_kook_channel_columns';
const defaultColumnOrder: ColumnKey[] = ['id', 'name', 'type', 'activeUserCount', 'durationSeconds', 'sessionCount', 'level', 'limitAmount'];
const defaultVisibleColumns: ColumnKey[] = [...defaultColumnOrder];
const defaultColumnWidths: Record<ColumnKey, number> = {
  id: 170,
  name: 180,
  type: 90,
  activeUserCount: 110,
  durationSeconds: 130,
  sessionCount: 100,
  level: 90,
  limitAmount: 100,
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

function channelType(value: unknown) {
  const type = Number(value);
  if (type === 0) return <Tag>分组</Tag>;
  if (type === 2) return <Tag color="blue">语音</Tag>;
  return <Tag color="green">文字</Tag>;
}

function rowName(row: Row) {
  return row.name || String(row.id || '-');
}

function parentIdOf(row: Row) {
  return String(row.parent_id || row.parentId || '');
}

function trimEmptyChildren(row: Row): Row {
  const children = row.children?.map(trimEmptyChildren).filter(Boolean);
  return children?.length ? { ...row, children } : { ...row, children: undefined };
}

function buildChannelTree(rows: Row[], filters: { keyword?: string }) {
  const byId = new Map<string, Row>();
  rows.forEach((row) => byId.set(String(row.id), { ...row, children: [] }));

  const matched = new Set<string>();
  const keyword = String(filters.keyword || '').trim().toLowerCase();
  rows.forEach((row) => {
    const keywordMatched = !keyword || String(row.name || '').toLowerCase().includes(keyword);
    if (!keywordMatched) return;
    for (let current: Row | undefined = row; current; current = byId.get(parentIdOf(current))) {
      matched.add(String(current.id));
    }
  });
  if (matched.size === 0) {
    rows.forEach((row) => matched.add(String(row.id)));
  }

  const tree: Row[] = [];
  rows.forEach((row) => {
    const id = String(row.id);
    const node = byId.get(id);
    if (!node || !matched.has(id)) return;
    const parent = byId.get(parentIdOf(node));
    if (parent && matched.has(String(parent.id))) {
      parent.children = [...(parent.children || []), node];
    } else {
      tree.push(node);
    }
  });
  return tree.map(trimEmptyChildren);
}

function rowDurationSeconds(row: Row): number {
  return Number(row.durationSeconds || 0) + (row.children || []).reduce((sum, child) => sum + rowDurationSeconds(child), 0);
}

function rowSessionCount(row: Row): number {
  return Number(row.sessionCount || 0) + (row.children || []).reduce((sum, child) => sum + rowSessionCount(child), 0);
}

function rowActiveUserCount(row: Row): number {
  return Number(row.activeUserCount || 0) + (row.children || []).reduce((sum, child) => sum + rowActiveUserCount(child), 0);
}

function durationText(seconds: number) {
  if (seconds <= 0) return '0秒';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  if (minutes > 0) return `${minutes}分钟${secs}秒`;
  return `${secs}秒`;
}

function cellTooltip(value: unknown) {
  const text = String(value || '-');
  return (
    <Tooltip title={text}>
      <span className="table-cell-ellipsis">{text}</span>
    </Tooltip>
  );
}

function readColumnPreference(): ColumnPreference {
  try {
    const saved = JSON.parse(localStorage.getItem(columnPreferenceKey) || '{}') as Partial<ColumnPreference>;
    const order = normalizeColumnOrder(saved.order);
    const visible = normalizeVisibleColumns(saved.visible);
    const widths = normalizeColumnWidths(saved.widths);
    return { order, visible, widths };
  } catch {
    return { order: defaultColumnOrder, visible: defaultVisibleColumns, widths: defaultColumnWidths };
  }
}

function normalizeColumnOrder(value?: ColumnKey[]) {
  const valid = new Set(defaultColumnOrder);
  const ordered = (value || []).filter((key) => valid.has(key));
  return [...ordered, ...defaultColumnOrder.filter((key) => !ordered.includes(key))];
}

function normalizeVisibleColumns(value?: ColumnKey[]) {
  const valid = new Set(defaultColumnOrder);
  const visible = (value || defaultVisibleColumns).filter((key) => valid.has(key));
  return visible.length ? visible : defaultVisibleColumns;
}

function normalizeColumnWidths(value?: ColumnWidths): ColumnWidths {
  return defaultColumnOrder.reduce<ColumnWidths>((widths, key) => {
    const width = Number(value?.[key]);
    widths[key] = Number.isFinite(width) && width >= 72 ? Math.min(width, 520) : defaultColumnWidths[key];
    return widths;
  }, {});
}

function moveColumn(keys: ColumnKey[], key: ColumnKey, direction: -1 | 1) {
  const index = keys.indexOf(key);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= keys.length) return keys;
  const next = [...keys];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
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
  const [usageByChannel, setUsageByChannel] = useState<Record<string, KookChannelUsage>>({});
  const [usageRange, setUsageRange] = useState<{ startTime: string; endTime: string } | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [filters, setFilters] = useState<{ keyword?: string }>({});
  const [loading, setLoading] = useState(false);
  const [columnPreference, setColumnPreference] = useState<ColumnPreference>(() => readColumnPreference());
  const [columnSettingOpen, setColumnSettingOpen] = useState(false);
  const [sortDrawerOpen, setSortDrawerOpen] = useState(false);
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
  const [moveForm] = Form.useForm<{ userIds: string[] | string }>();
  const [roleForm] = Form.useForm();
  const roleValueType = Form.useWatch('type', roleForm);
  const { message, modal } = AntApp.useApp();

  const buildUsageParams = () => {
    const range = filterForm.getFieldValue('usageRange') as DateLike[] | undefined;
    return {
      startTime: range?.[0]?.format(dateTimeFormat),
      endTime: range?.[1]?.format(dateTimeFormat),
    };
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await listKookChannels({});
      setRows(channelItems(data));
    } finally {
      setLoading(false);
    }
  };

  const loadUsage = async () => {
    setUsageLoading(true);
    try {
      const data = await listKookChannelUsageSummary(buildUsageParams());
      setUsageRange(data.range);
      setUsageByChannel(Object.fromEntries((data.list || []).map((item) => [item.channelId, item])));
    } finally {
      setUsageLoading(false);
    }
  };

  const applyFilters = async (values: Record<string, unknown>) => {
    setFilters({
      keyword: values.keyword as string | undefined,
    });
    await loadUsage();
  };

  const refreshChannelData = async () => {
    await Promise.all([load(), loadUsage()]);
  };

  useEffect(() => {
    load();
    loadUsage();
    const timer = window.setInterval(loadUsage, 15000);
    return () => window.clearInterval(timer);
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
      let payload = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== ''),
      );
      if (payload.type === 0) {
        payload = { name: payload.name, isCategory: 1 };
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
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Row) => {
    await deleteKookChannel(row.id);
    message.success('频道已删除');
    await load();
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
    const userIds = Array.isArray(values.userIds)
      ? values.userIds
      : values.userIds.split(/[\s,，]+/).map((id) => id.trim()).filter(Boolean);
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
    const payload = {
      type: values.type,
      value: values.value,
      allow: permissionValue(values.allowPermissions),
      deny: permissionValue(values.denyPermissions),
    };
    if (update) {
      await updateKookChannelRole(rolesTarget.id, payload);
      message.success('权限已更新');
    } else {
      await createKookChannelRole(rolesTarget.id, payload);
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

  const saveColumnPreference = (next: ColumnPreference) => {
    setColumnPreference(next);
    localStorage.setItem(columnPreferenceKey, JSON.stringify(next));
  };

  const columnDefinitions: ColumnDefinition[] = [
    { key: 'id', title: '频道 ID', defaultVisible: true, column: { title: '频道 ID', dataIndex: 'id', className: 'mono', ellipsis: true, render: cellTooltip } },
    { key: 'name', title: '名称', defaultVisible: true, column: { title: '名称', dataIndex: 'name', ellipsis: true, render: cellTooltip } },
    { key: 'type', title: '类型', defaultVisible: true, column: { title: '类型', dataIndex: 'type', render: channelType } },
    {
      key: 'activeUserCount',
      title: '在线人数',
      defaultVisible: true,
      column: {
        title: '在线人数',
        render: (_, row) => {
          const count = rowActiveUserCount(row);
          return count > 0 ? <Tag color="green">{count} 人在线</Tag> : <Tag>0 人</Tag>;
        },
      },
    },
    {
      key: 'durationSeconds',
      title: '使用时长',
      defaultVisible: true,
      column: {
        title: '使用时长',
        render: (_, row) => durationText(rowDurationSeconds(row)),
      },
    },
    {
      key: 'sessionCount',
      title: '会话数',
      defaultVisible: true,
      column: {
        title: '会话数',
        render: (_, row) => rowSessionCount(row),
      },
    },
    { key: 'level', title: '排序', defaultVisible: true, column: { title: '排序', dataIndex: 'level' } },
    { key: 'limitAmount', title: '人数限制', defaultVisible: true, column: { title: '人数限制', render: (_, row) => row.limit_amount || row.limitAmount || '-' } },
  ];

  const columns: ColumnsType<Row> = [
    ...columnPreference.order
      .filter((key) => columnPreference.visible.includes(key))
      .map((key) => {
        const definition = columnDefinitions.find((item) => item.key === key);
        return definition ? { ...definition.column, width: columnPreference.widths[key] || defaultColumnWidths[key] } : undefined;
      })
      .filter(Boolean) as ColumnsType<Row>,
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
  const scrollX = columns.reduce((sum, column) => sum + (Number(column?.width) || 160), 0);

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
    { title: '允许权限', dataIndex: 'allow', width: 220, ellipsis: true, render: permissionText },
    { title: '拒绝权限', dataIndex: 'deny', width: 220, ellipsis: true, render: permissionText },
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
  const userTableColumns = useTableColumnSettings('kook-channel-users', userColumns);
  const roleTableColumns = useTableColumnSettings('kook-channel-roles', roleColumns);

  const roleRows = [
    ...((roles?.permission_overwrites || []) as RoleRow[]),
    ...((roles?.permission_users || []) as RoleRow[]),
  ];
  const enrichedRows = useMemo(() => rows.map((row) => ({
    ...row,
    ...usageByChannel[String(row.id)],
  })), [rows, usageByChannel]);
  const sortCategories = useMemo(() => rows
    .filter((row) => Number(row.type) === 0)
    .map((row) => ({ id: row.id, name: row.name, level: row.level })), [rows]);
  const treeRows = buildChannelTree(enrichedRows, filters);

  return (
    <>
      <PageHeader
        title="KOOK 频道"
        description="管理 KOOK 频道、语音成员移动和频道权限。"
        extra={(
          <Space wrap className="kook-channel-toolbar">
            <Button icon={<ScheduleOutlined />} onClick={() => setSortDrawerOpen(true)}>自动排序设置</Button>
            <Button icon={<SettingOutlined />} onClick={() => setColumnSettingOpen(true)}>列设置</Button>
            <Button type="primary" onClick={openCreate}>创建频道</Button>
          </Space>
        )}
      />

      <Card className="filter-card">
        <Form form={filterForm} layout="inline" onFinish={applyFilters}>
          <Form.Item name="keyword" label="频道名称">
            <Input.Search placeholder="搜索频道名称" allowClear />
          </Form.Item>
          <Form.Item name="usageRange" label="使用时长区间">
            <DatePicker.RangePicker showTime format={dateTimeFormat} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">查询</Button>
            <Button onClick={() => { filterForm.resetFields(); setFilters({}); loadUsage(); }}>重置</Button>
            <Button onClick={() => void refreshChannelData()} loading={loading || usageLoading}>刷新</Button>
          </Space>
        </Form>
      </Card>
      <Typography.Paragraph type="secondary">
        {`共 ${treeRows.length} 个顶层频道，${rows.length} 个频道。统计区间：${usageRange?.startTime || '-'} 至 ${usageRange?.endTime || '-'}，在线人数每 15 秒刷新。`}
      </Typography.Paragraph>

      <Table
        rowKey={(row) => String(row.id)}
        loading={loading || usageLoading}
        columns={columns}
        dataSource={treeRows}
        scroll={{ x: scrollX }}
        pagination={false}
        expandable={{ defaultExpandAllRows: true }}
      />

      <KookChannelSortDrawer
        open={sortDrawerOpen}
        categories={sortCategories}
        onClose={() => setSortDrawerOpen(false)}
        onCompleted={refreshChannelData}
      />

      <Modal
        title="自定义展示列"
        open={columnSettingOpen}
        onCancel={() => setColumnSettingOpen(false)}
        footer={[
          <Button
            key="reset"
            onClick={() => saveColumnPreference({ order: defaultColumnOrder, visible: defaultVisibleColumns, widths: defaultColumnWidths })}
          >
            恢复默认
          </Button>,
          <Button key="close" type="primary" onClick={() => setColumnSettingOpen(false)}>
            完成
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {columnPreference.order.map((key, index) => {
            const definition = columnDefinitions.find((item) => item.key === key);
            if (!definition) return null;
            const checked = columnPreference.visible.includes(key);
            const onlyVisible = checked && columnPreference.visible.length === 1;
            return (
              <Card key={key} size="small">
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Checkbox
                    checked={checked}
                    disabled={onlyVisible}
                    onChange={(event) => {
                      const visible = event.target.checked
                        ? [...columnPreference.visible, key]
                        : columnPreference.visible.filter((item) => item !== key);
                      saveColumnPreference({ ...columnPreference, visible: normalizeVisibleColumns(visible) });
                    }}
                  >
                    {definition.title}
                  </Checkbox>
                  <Space>
                    <InputNumber
                      aria-label={`${definition.title}列宽`}
                      addonAfter="px"
                      min={72}
                      max={520}
                      step={10}
                      value={columnPreference.widths[key] || defaultColumnWidths[key]}
                      onChange={(value) => {
                        const widths = normalizeColumnWidths({
                          ...columnPreference.widths,
                          [key]: Number(value) || defaultColumnWidths[key],
                        });
                        saveColumnPreference({ ...columnPreference, widths });
                      }}
                    />
                    <Button
                      aria-label={`${definition.title}上移`}
                      disabled={index === 0}
                      icon={<ArrowUpOutlined />}
                      onClick={() => saveColumnPreference({ ...columnPreference, order: moveColumn(columnPreference.order, key, -1) })}
                    />
                    <Button
                      aria-label={`${definition.title}下移`}
                      disabled={index === columnPreference.order.length - 1}
                      icon={<ArrowDownOutlined />}
                      onClick={() => saveColumnPreference({ ...columnPreference, order: moveColumn(columnPreference.order, key, 1) })}
                    />
                  </Space>
                </Space>
              </Card>
            );
          })}
        </Space>
      </Modal>

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
        <Space align="start" wrap>
          {userTableColumns.button}
          <Form form={moveForm} layout="inline" onFinish={moveUsers}>
            <Form.Item name="userIds" rules={[{ required: true, message: '请输入用户 ID' }]}>
              <KookMemberSelect mode="multiple" placeholder="搜索并选择用户" style={{ width: 360 }} />
            </Form.Item>
            <Button type="primary" htmlType="submit">移动到当前频道</Button>
          </Form>
        </Space>
        <Table
          style={{ marginTop: 16 }}
          rowKey={(row) => String(row.id)}
          loading={usersLoading}
          columns={userTableColumns.columns}
          dataSource={users}
          pagination={false}
          scroll={{ x: userTableColumns.scrollX }}
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
                    {roleTableColumns.button}
                    <Button onClick={refreshRoles} loading={rolesLoading}>刷新</Button>
                    <Button onClick={syncRoles}>同步分组权限</Button>
                    <Typography.Text type="secondary">同步状态：{String(roles?.permission_sync ?? '-')}</Typography.Text>
                  </Space>
                  <Table
                    rowKey={roleKey}
                    loading={rolesLoading}
                    columns={roleTableColumns.columns}
                    dataSource={roleRows}
                    pagination={false}
                    scroll={{ x: roleTableColumns.scrollX }}
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
                    <Select
                      options={roleTypeOptions}
                      onChange={() => roleForm.setFieldValue('value', undefined)}
                    />
                  </Form.Item>
                  <Form.Item label="对象 ID" name="value" rules={[{ required: true, message: '请输入用户或角色 ID' }]}>
                    {roleValueType === 'role_id' ? <KookRoleSelect /> : <KookMemberSelect />}
                  </Form.Item>
                  <Form.Item label="允许权限" name="allowPermissions">
                    <Select mode="multiple" allowClear options={kookPermissionOptions} optionFilterProp="label" />
                  </Form.Item>
                  <Form.Item label="拒绝权限" name="denyPermissions">
                    <Select mode="multiple" allowClear options={kookPermissionOptions} optionFilterProp="label" />
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
