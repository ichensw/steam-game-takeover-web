import {
  Button,
  Card,
  DatePicker,
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
  TimePicker,
  Typography,
  App as AntApp,
} from 'antd';
import dayjs from 'dayjs';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { useEffect, useState } from 'react';
import {
  createTakeover,
  deleteTakeover,
  getTakeover,
  listKookChannels,
  listTakeoverMemberActivities,
  listTakeovers,
  updateTakeover,
} from '../api/admin';
import PageHeader from '../components/PageHeader';
import StatusTag from '../components/StatusTag';
import { tableCellTooltip, useTableColumnSettings } from '../components/tableColumnSettings';
import { pageSizeOptions, responsePageSize } from '../utils/pagination';

type DateLike = { format: (template: string) => string };
type TakeoverRow = Record<string, unknown> & {
  id: React.Key;
  title?: string;
  statusLabel?: string;
  joinedCount?: number;
  participantLimit?: number;
  scheduleText?: string;
  creatorName?: string;
  description?: string;
  kookChannelName?: string;
  kookChannelId?: string;
  kookInviteUrl?: string;
  summaryName?: string;
  summarySource?: string;
  summaryUpdatedAt?: string;
  summaryError?: string;
  scheduleType?: number;
  startDate?: string;
  endDate?: string;
  playTime?: string;
  members?: MemberRow[];
  memberActivities?: MemberActivityRow[];
};
type MemberRow = Record<string, unknown> & {
  userId: React.Key;
  nickname?: string;
  openid?: string;
  openId?: string;
  open_id?: string;
  steamId?: string;
  remark?: string;
  joinedAt?: string;
};
type MemberActivityRow = Record<string, unknown> & {
  id: React.Key;
  userId: React.Key;
  nickname?: string;
  openid?: string;
  openId?: string;
  open_id?: string;
  steamId?: string;
  remark?: string;
  action?: number;
  actionText?: string;
  createdAt?: string;
};
type ChannelOption = { value: string; label: string };

export default function Takeovers() {
  const [rows, setRows] = useState<TakeoverRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<{ field?: string; order?: string }>({
    field: 'createdAt',
    order: 'desc',
  });
  const [detail, setDetail] = useState<TakeoverRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activityRows, setActivityRows] = useState<MemberActivityRow[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(20);
  const [activityLoading, setActivityLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<TakeoverRow | null>(null);
  const [editorSubmitting, setEditorSubmitting] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summarySubmitting, setSummarySubmitting] = useState(false);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [form] = Form.useForm();
  const [editorForm] = Form.useForm();
  const [summaryForm] = Form.useForm();
  const timeFilter = Form.useWatch('timeFilter', form);
  const editorScheduleType = Form.useWatch('scheduleType', editorForm);
  const { message } = AntApp.useApp();

  const buildParams = (
    targetPage: number,
    targetPageSize: number,
    nextSort: { field?: string; order?: string } = sort,
  ) => {
    const values = form.getFieldsValue();
    const dateRange = values.dateRange as DateLike[] | undefined;
    const params: Record<string, string | number | undefined> = {
      page: targetPage,
      pageSize: targetPageSize,
      keyword: values.keyword,
      status: values.status,
      timeFilter: values.timeFilter,
      sortField: nextSort.field,
      sortOrder: nextSort.order,
    };
    if (values.timeFilter === 'custom_range' && dateRange?.length === 2) {
      params.startDate = dateRange[0].format('YYYY-MM-DD');
      params.endDate = dateRange[1].format('YYYY-MM-DD');
    }
    return params;
  };

  const load = async (targetPage = page, targetPageSize = pageSize, nextSort = sort) => {
    setLoading(true);
    try {
      const res = await listTakeovers(buildParams(targetPage, targetPageSize, nextSort));
      setRows((res.list || res.items || []) as TakeoverRow[]);
      setTotal(res.total || 0);
      setPage(targetPage);
      setPageSize(responsePageSize(res, targetPageSize));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadChannels = async () => {
    try {
      const data = await listKookChannels({ page: 1, pageSize: 500 });
      const rows = ((data.items || data.list || []) as Record<string, unknown>[]);
      setChannels(rows.map((row) => {
        const value = String(row.id || row.channel_id || row.channelId || '');
        return { value, label: String(row.name || row.channelName || row.channel_name || value) };
      }).filter((item) => item.value));
    } catch {
      setChannels([]);
    }
  };

  const openDetail = async (id: React.Key) => {
    setDetailLoading(true);
    setActivityRows([]);
    setActivityTotal(0);
    setActivityPage(1);
    setDetail({ id });
    try {
      const row = (await getTakeover(id)) as TakeoverRow;
      setDetail(row);
      await loadActivities(id, 1, activityPageSize, row.memberActivities || []);
    } finally {
      setDetailLoading(false);
    }
  };

  const loadActivities = async (
    id: React.Key,
    targetPage = activityPage,
    targetPageSize = activityPageSize,
    fallback?: MemberActivityRow[],
  ) => {
    setActivityLoading(true);
    try {
      const res = await listTakeoverMemberActivities(id, {
        page: targetPage,
        pageSize: targetPageSize,
      });
      setActivityRows((res.list || res.items || []) as MemberActivityRow[]);
      setActivityTotal(res.total || 0);
      setActivityPage(targetPage);
      setActivityPageSize(responsePageSize(res, targetPageSize));
    } catch (error) {
      if (fallback) {
        setActivityRows(fallback);
        setActivityTotal(fallback.length);
      } else {
        throw error;
      }
    } finally {
      setActivityLoading(false);
    }
  };

  const remove = async (id: React.Key) => {
    await deleteTakeover(id);
    message.success('接龙已删除');
    load();
  };

  const openCreate = () => {
    setEditing(null);
    editorForm.resetFields();
    editorForm.setFieldsValue({
      participantLimit: 4,
      scheduleType: 1,
      playTime: dayjs('20:00', 'HH:mm'),
      description: '',
      summaryName: '',
    });
    setEditorOpen(true);
  };

  const openEdit = async (id: React.Key) => {
    setEditorSubmitting(true);
    try {
      const row = (await getTakeover(id)) as TakeoverRow;
      setEditing(row);
      editorForm.resetFields();
      editorForm.setFieldsValue({
        title: row.title,
        participantLimit: row.participantLimit,
        scheduleType: row.scheduleType || 1,
        startDate: row.startDate ? dayjs(row.startDate) : undefined,
        endDate: row.endDate ? dayjs(row.endDate) : undefined,
        playTime: row.playTime ? dayjs(row.playTime.slice(0, 5), 'HH:mm') : undefined,
        description: row.description || '',
        kookChannelId: row.kookChannelId || '',
        summaryName: row.summaryName || '',
      });
      setEditorOpen(true);
    } finally {
      setEditorSubmitting(false);
    }
  };

  const takeoverPayload = (values: Record<string, unknown>) => {
    const scheduleType = Number(values.scheduleType || 1);
    const kookChannelId = String(values.kookChannelId || '');
    return {
      title: String(values.title || '').trim(),
      creatorUserId: values.creatorUserId ? Number(values.creatorUserId) : undefined,
      participantLimit: Number(values.participantLimit || 0),
      scheduleType,
      startDate: scheduleType === 2 ? undefined : (values.startDate as DateLike | undefined)?.format('YYYY-MM-DD'),
      endDate: scheduleType === 3 ? (values.endDate as DateLike | undefined)?.format('YYYY-MM-DD') : undefined,
      playTime: (values.playTime as DateLike | undefined)?.format('HH:mm') || String(values.playTime || '').slice(0, 5),
      description: String(values.description || '').trim(),
      kookChannelId,
      kookChannelName: channels.find((item) => item.value === kookChannelId)?.label || '',
      summaryName: String(values.summaryName || '').trim() || undefined,
    };
  };

  const saveTakeover = async (values: Record<string, unknown>) => {
    setEditorSubmitting(true);
    try {
      if (editing) {
        await updateTakeover(editing.id, takeoverPayload(values));
        message.success('接龙已保存');
      } else {
        await createTakeover(takeoverPayload(values));
        message.success('接龙已新增');
      }
      setEditorOpen(false);
      await load(editing ? page : 1);
    } finally {
      setEditorSubmitting(false);
    }
  };

  const openSummaryModal = () => {
    summaryForm.setFieldsValue({ summaryName: detail?.summaryName || '' });
    setSummaryModalOpen(true);
  };

  const saveSummaryName = async () => {
    if (!detail) return;
    const values = await summaryForm.validateFields();
    setSummarySubmitting(true);
    try {
      const updated = await updateTakeover(detail.id, {
        title: detail.title,
        participantLimit: detail.participantLimit,
        scheduleType: detail.scheduleType,
        startDate: detail.startDate,
        endDate: detail.endDate,
        playTime: detail.playTime?.slice(0, 5),
        description: detail.description || '',
        kookChannelId: detail.kookChannelId || '',
        kookChannelName: detail.kookChannelName || '',
        summaryName: values.summaryName,
      });
      setDetail(updated as TakeoverRow);
      setSummaryModalOpen(false);
      message.success('汇总展示词已保存');
      load();
    } finally {
      setSummarySubmitting(false);
    }
  };

  const onTableChange = (
    pagination: TablePaginationConfig,
    _filters: unknown,
    sorter: SorterResult<TakeoverRow> | SorterResult<TakeoverRow>[],
  ) => {
    const singleSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    const fieldMap: Record<string, string> = {
      takeoverState: 'status',
      startDate: 'startDate',
      participantLimit: 'participantLimit',
    };
    const field = (singleSorter?.field as string) || 'createdAt';
    const nextSort = {
      field: fieldMap[field] || field,
      order: singleSorter?.order === 'ascend' ? 'asc' : 'desc',
    };
    setSort(nextSort);
    load(pagination.current || 1, pagination.pageSize || pageSize, nextSort);
  };

  const reset = () => {
    form.resetFields();
    setSort({ field: 'createdAt', order: 'desc' });
    setTimeout(() => load(1), 0);
  };

  const columns: ColumnsType<TakeoverRow> = [
    { title: 'ID', dataIndex: 'id', width: 84, className: 'mono', sorter: true },
    { title: '标题', dataIndex: 'title', ellipsis: true, sorter: true },
    {
      title: '汇总词',
      dataIndex: 'summaryName',
      width: 170,
      render: (_, row) => (
        <Space size={6}>
          <Typography.Text>{row.summaryName || '-'}</Typography.Text>
          {row.summarySource && <Tag>{summarySourceText(row.summarySource)}</Tag>}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'takeoverState',
      width: 110,
      render: (_, row) => <StatusTag value={row.statusLabel} />,
      sorter: true,
    },
    {
      title: '人数',
      dataIndex: 'participantLimit',
      width: 100,
      render: (_, row) => `${row.joinedCount ?? 0}/${row.participantLimit ?? '-'}`,
      sorter: true,
    },
    {
      title: '时间',
      dataIndex: 'startDate',
      width: 220,
      className: 'mono',
      render: (_, row) => row.scheduleText || '-',
      sorter: true,
    },
    { title: '创建人', dataIndex: 'creatorName', width: 140 },
    {
      title: '操作',
      width: 210,
      fixed: 'right',
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => openDetail(row.id)}>
            详情
          </Button>
          {Number(row.takeoverState) !== 2 && (
            <Button size="small" onClick={() => openEdit(row.id)}>
              编辑
            </Button>
          )}
          <Popconfirm
            title="删除接龙"
            description="确认删除该接龙？此操作会从列表隐藏。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => remove(row.id)}
          >
            <Button size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  const memberColumns: ColumnsType<MemberRow> = [
    { title: '用户', dataIndex: 'nickname', width: 120 },
    {
      title: 'openid',
      ellipsis: true,
      className: 'mono',
      render: (_, row) => tableCellTooltip(row.openid || row.openId || row.open_id || '-'),
    },
    { title: 'SteamID', dataIndex: 'steamId', width: 140, className: 'mono' },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    { title: '加入时间', dataIndex: 'joinedAt', width: 170, className: 'mono' },
  ];
  const activityColumns: ColumnsType<MemberActivityRow> = [
    { title: '用户', dataIndex: 'nickname', width: 120 },
    {
      title: '动作',
      dataIndex: 'actionText',
      width: 90,
      render: (_, row) => (
        <Tag color={Number(row.action) === 2 ? 'default' : 'blue'}>
          {row.actionText || (Number(row.action) === 2 ? '退出' : '加入')}
        </Tag>
      ),
    },
    {
      title: 'openid',
      ellipsis: true,
      className: 'mono',
      render: (_, row) => tableCellTooltip(row.openid || row.openId || row.open_id || '-'),
    },
    { title: 'SteamID', dataIndex: 'steamId', width: 140, className: 'mono' },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    { title: '时间', dataIndex: 'createdAt', width: 170, className: 'mono' },
  ];
  const tableColumns = useTableColumnSettings('takeovers', columns);
  const memberTableColumns = useTableColumnSettings('takeover-members', memberColumns);
  const activityTableColumns = useTableColumnSettings('takeover-member-activities', activityColumns);

  return (
    <>
      <PageHeader
        title="接龙管理"
        description="查询、筛选和维护管理员侧接龙数据。"
        extra={(
          <Space>
            {tableColumns.button}
            <Button type="primary" onClick={openCreate}>新增接龙</Button>
          </Space>
        )}
      />
      <Card className="filter-card">
        <Form form={form} layout="inline" onFinish={() => load(1)}>
          <Form.Item name="keyword">
            <Input.Search placeholder="标题 / 创建人 / SteamID" allowClear />
          </Form.Item>
          <Form.Item name="status">
            <Select
              placeholder="状态"
              allowClear
              style={{ width: 140 }}
              options={[
                { value: 'normal', label: '进行中' },
                { value: 'closed', label: '已结束' },
              ]}
            />
          </Form.Item>
          <Form.Item name="timeFilter" initialValue="all">
            <Select
              placeholder="时间筛选"
              style={{ width: 150 }}
              options={[
                { value: 'all', label: '全部时间' },
                { value: 'today', label: '今天' },
                { value: 'tomorrow', label: '明天' },
                { value: 'this_week', label: '本周' },
                { value: 'daily', label: '每日固定' },
                { value: 'date_range', label: '日期范围' },
                { value: 'custom_range', label: '自定义日期' },
              ]}
            />
          </Form.Item>
          {timeFilter === 'custom_range' && (
            <Form.Item name="dateRange">
              <DatePicker.RangePicker />
            </Form.Item>
          )}
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
        onChange={onTableChange}
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
      <Drawer
        title="接龙详情"
        width={820}
        open={!!detail}
        onClose={() => setDetail(null)}
        loading={detailLoading}
      >
        {detail && (
          <Space direction="vertical" size={18} className="detail-stack">
            <div className="takeover-detail-table">
              <div className="takeover-detail-row takeover-detail-row--pair">
                <div className="takeover-detail-label">ID</div>
                <div className="takeover-detail-value">{detail.id}</div>
                <div className="takeover-detail-label">状态</div>
                <div className="takeover-detail-value">
                  <StatusTag value={detail.statusLabel} />
                </div>
              </div>
              <div className="takeover-detail-row">
                <div className="takeover-detail-label">标题</div>
                <div className="takeover-detail-value takeover-detail-value--full">{detail.title || '-'}</div>
              </div>
              <div className="takeover-detail-row takeover-detail-row--pair">
                <div className="takeover-detail-label">汇总词</div>
                <div className="takeover-detail-value">
                  <Space wrap>
                    <Typography.Text>{detail.summaryName || '-'}</Typography.Text>
                    {detail.summarySource && <Tag>{summarySourceText(detail.summarySource)}</Tag>}
                    <Button size="small" onClick={openSummaryModal}>
                      修改
                    </Button>
                    {Number(detail.takeoverState) !== 2 && (
                      <Button size="small" onClick={() => openEdit(detail.id)}>
                        编辑接龙
                      </Button>
                    )}
                  </Space>
                </div>
                <div className="takeover-detail-label">汇总更新时间</div>
                <div className="takeover-detail-value">
                  <span className="mono">{detail.summaryUpdatedAt || '-'}</span>
                </div>
              </div>
              {detail.summaryError && (
                <div className="takeover-detail-row">
                  <div className="takeover-detail-label">汇总错误</div>
                  <div className="takeover-detail-value takeover-detail-value--full">
                    <Typography.Text type="danger">{detail.summaryError}</Typography.Text>
                  </div>
                </div>
              )}
              <div className="takeover-detail-row">
                <div className="takeover-detail-label">创建人</div>
                <div className="takeover-detail-value takeover-detail-value--full">{detail.creatorName || '-'}</div>
              </div>
              <div className="takeover-detail-row takeover-detail-row--pair">
                <div className="takeover-detail-label">人数</div>
                <div className="takeover-detail-value">{detail.joinedCount ?? 0}/{detail.participantLimit ?? '-'}</div>
                <div className="takeover-detail-label">时间</div>
                <div className="takeover-detail-value">
                  <span className="mono">{detail.scheduleText || '-'}</span>
                </div>
              </div>
              <div className="takeover-detail-row">
                <div className="takeover-detail-label">KOOK频道</div>
                <div className="takeover-detail-value takeover-detail-value--full">{detail.kookChannelName || '-'}</div>
              </div>
              <div className="takeover-detail-row">
                <div className="takeover-detail-label">KOOK邀请</div>
                <div className="takeover-detail-value takeover-detail-value--full">
                  {detail.kookInviteUrl ? (
                    <Typography.Link copyable href={detail.kookInviteUrl} target="_blank">
                      {detail.kookInviteUrl}
                    </Typography.Link>
                  ) : (
                    '-'
                  )}
                </div>
              </div>
              <div className="takeover-detail-row">
                <div className="takeover-detail-label">介绍</div>
                <div className="takeover-detail-value takeover-detail-value--full">{detail.description || '-'}</div>
              </div>
            </div>
            <Tabs
              items={[
                {
                  key: 'members',
                  label: `成员列表 ${detail.members?.length || 0}`,
                  children: (
                    <Table<MemberRow>
                      rowKey={(row) => String(row.userId)}
                      size="small"
                      pagination={false}
                      dataSource={detail.members || []}
                      columns={memberTableColumns.columns}
                      scroll={{ x: memberTableColumns.scrollX }}
                    />
                  ),
                },
                {
                  key: 'activities',
                  label: `进出记录 ${activityTotal || activityRows.length}`,
                  children: (
                    <Space direction="vertical" size={10} className="detail-stack">
                      <div className="table-toolbar">
                        {activityTableColumns.button}
                      </div>
                      <Table<MemberActivityRow>
                        rowKey={(row) => String(row.id)}
                        size="small"
                        loading={activityLoading}
                        dataSource={activityRows}
                        columns={activityTableColumns.columns}
                        scroll={{ x: activityTableColumns.scrollX }}
                        pagination={{
                          total: activityTotal,
                          current: activityPage,
                          pageSize: activityPageSize,
                          pageSizeOptions,
                          showSizeChanger: true,
                          showTotal: (n) => `共 ${n} 条`,
                          onChange: (nextPage, nextPageSize) => loadActivities(detail.id, nextPage, nextPageSize),
                        }}
                      />
                    </Space>
                  ),
                },
              ]}
            />
          </Space>
        )}
      </Drawer>
      <Drawer
        title={editing ? '编辑接龙' : '新增接龙'}
        width={640}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
      >
        <Form form={editorForm} layout="vertical" disabled={editorSubmitting} onFinish={saveTakeover}>
          {!editing && (
            <Form.Item label="创建人用户 ID" name="creatorUserId" rules={[{ required: true, message: '请输入创建人用户 ID' }]}>
              <InputNumber min={1} precision={0} className="mono" style={{ width: '100%' }} />
            </Form.Item>
          )}
          <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }, { max: 30, message: '最多 30 个字' }]}>
            <Input maxLength={30} showCount />
          </Form.Item>
          <Form.Item label="人数上限" name="participantLimit" rules={[{ required: true, message: '请输入人数上限' }]}>
            <InputNumber min={2} max={99} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="时间类型" name="scheduleType" rules={[{ required: true, message: '请选择时间类型' }]}>
            <Select
              options={[
                { value: 1, label: '指定日期' },
                { value: 2, label: '每日固定' },
                { value: 3, label: '日期范围' },
              ]}
            />
          </Form.Item>
          {Number(editorScheduleType || 1) !== 2 && (
            <Form.Item label={Number(editorScheduleType) === 3 ? '开始日期' : '日期'} name="startDate" rules={[{ required: true, message: '请选择日期' }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          )}
          {Number(editorScheduleType) === 3 && (
            <Form.Item label="结束日期" name="endDate" rules={[{ required: true, message: '请选择结束日期' }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          )}
          <Form.Item label="固定时间" name="playTime" rules={[{ required: true, message: '请选择固定时间' }]}>
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="KOOK 频道" name="kookChannelId">
            <Select allowClear showSearch optionFilterProp="label" options={channels} />
          </Form.Item>
          <Form.Item label="汇总展示词" name="summaryName" rules={[{ max: 12, message: '最多 12 个字' }]}>
            <Input maxLength={12} showCount placeholder="留空则自动提取或兜底" />
          </Form.Item>
          <Form.Item label="介绍" name="description" rules={[{ max: 500, message: '最多 500 个字' }]}>
            <Input.TextArea rows={4} maxLength={500} showCount />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={editorSubmitting}>保存</Button>
            <Button onClick={() => setEditorOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Drawer>
      <Modal
        title="修改汇总展示词"
        open={summaryModalOpen}
        onOk={saveSummaryName}
        onCancel={() => setSummaryModalOpen(false)}
        confirmLoading={summarySubmitting}
        okText="保存"
        cancelText="取消"
      >
        <Form form={summaryForm} layout="vertical">
          <Form.Item
            label="汇总展示词"
            name="summaryName"
            rules={[
              { required: true, message: '请输入汇总展示词' },
              { max: 12, message: '最多 12 个字' },
            ]}
          >
            <Input placeholder="例如：幻兽帕鲁" />
          </Form.Item>
          <Typography.Paragraph type="secondary">
            保存后来源会变为“人工”，后续 AI 不会自动覆盖。
          </Typography.Paragraph>
        </Form>
      </Modal>
    </>
  );
}

function summarySourceText(source?: string) {
  if (source === 'ai') return 'AI';
  if (source === 'manual') return '人工';
  if (source === 'fallback') return '兜底';
  return source || '-';
}
