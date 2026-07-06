import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  App as AntApp,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { useEffect, useState } from 'react';
import { deleteTakeover, getTakeover, listTakeovers } from '../api/admin';
import PageHeader from '../components/PageHeader';
import StatusTag from '../components/StatusTag';

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
  kookInviteUrl?: string;
  members?: MemberRow[];
};
type MemberRow = Record<string, unknown> & {
  userId: React.Key;
  nickname?: string;
  openid?: string;
  steamId?: string;
  remark?: string;
  joinedAt?: string;
};

export default function Takeovers() {
  const [rows, setRows] = useState<TakeoverRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ field?: string; order?: string }>({
    field: 'createdAt',
    order: 'desc',
  });
  const [detail, setDetail] = useState<TakeoverRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form] = Form.useForm();
  const timeFilter = Form.useWatch('timeFilter', form);
  const { message } = AntApp.useApp();

  const buildParams = (
    targetPage: number,
    nextSort: { field?: string; order?: string } = sort,
  ) => {
    const values = form.getFieldsValue();
    const dateRange = values.dateRange as DateLike[] | undefined;
    const params: Record<string, string | number | undefined> = {
      page: targetPage,
      pageSize: 20,
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

  const load = async (targetPage = page, nextSort = sort) => {
    setLoading(true);
    try {
      const res = await listTakeovers(buildParams(targetPage, nextSort));
      setRows((res.list || res.items || []) as TakeoverRow[]);
      setTotal(res.total || 0);
      setPage(targetPage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (id: React.Key) => {
    setDetailLoading(true);
    setDetail({ id });
    try {
      setDetail((await getTakeover(id)) as TakeoverRow);
    } finally {
      setDetailLoading(false);
    }
  };

  const remove = async (id: React.Key) => {
    await deleteTakeover(id);
    message.success('接龙已删除');
    load();
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
    load(pagination.current || 1, nextSort);
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
      width: 150,
      fixed: 'right',
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => openDetail(row.id)}>
            详情
          </Button>
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

  return (
    <>
      <PageHeader title="接龙管理" description="查询、筛选和维护管理员侧接龙数据。" />
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
        columns={columns}
        dataSource={rows}
        onChange={onTableChange}
        scroll={{ x: 980 }}
        pagination={{ total, current: page, pageSize: 20, showTotal: (n) => `共 ${n} 条` }}
      />
      <Drawer
        title="接龙详情"
        width={720}
        open={!!detail}
        onClose={() => setDetail(null)}
        loading={detailLoading}
      >
        {detail && (
          <Space direction="vertical" size={18} className="detail-stack">
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="ID">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <StatusTag value={detail.statusLabel} />
              </Descriptions.Item>
              <Descriptions.Item label="标题" span={2}>
                {detail.title || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="人数">
                {detail.joinedCount ?? 0}/{detail.participantLimit ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建人">
                {detail.creatorName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="时间" span={2}>
                <span className="mono">{detail.scheduleText || '-'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="KOOK频道" span={2}>
                {detail.kookChannelName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="KOOK邀请" span={2}>
                {detail.kookInviteUrl ? (
                  <Typography.Link copyable href={detail.kookInviteUrl} target="_blank">
                    {detail.kookInviteUrl}
                  </Typography.Link>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="介绍" span={2}>
                {detail.description || '-'}
              </Descriptions.Item>
            </Descriptions>
            <Table<MemberRow>
              rowKey={(row) => String(row.userId)}
              size="small"
              pagination={false}
              dataSource={detail.members || []}
              columns={[
                { title: '用户', dataIndex: 'nickname', width: 120 },
                { title: 'openid', dataIndex: 'openid', ellipsis: true, className: 'mono' },
                { title: 'SteamID', dataIndex: 'steamId', width: 140, className: 'mono' },
                { title: '备注', dataIndex: 'remark', ellipsis: true },
                { title: '加入时间', dataIndex: 'joinedAt', width: 170, className: 'mono' },
              ]}
            />
          </Space>
        )}
      </Drawer>
    </>
  );
}
