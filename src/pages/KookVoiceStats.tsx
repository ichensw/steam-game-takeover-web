import {
  BarChartOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Form, Input, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import {
  getKookVoiceStats,
  listKookChannels,
  type KookVoiceSession,
  type KookVoiceStats as KookVoiceStatsData,
  type KookVoiceUsage,
} from '../api/admin';
import PageHeader from '../components/PageHeader';
import { useTableColumnSettings } from '../components/tableColumnSettings';
import { pageSizeOptions } from '../utils/pagination';

type DateLike = { format: (template: string) => string };
type ChannelOption = { value: string; label: string };

const dateTimeFormat = 'YYYY-MM-DD HH:mm:ss';

function displayName(row: Pick<KookVoiceUsage, 'nickname' | 'username' | 'kookUserId'>) {
  return row.nickname || row.username || row.kookUserId || '-';
}

function channelName(row: Pick<KookVoiceUsage, 'channelName' | 'channelId'>) {
  return row.channelName || row.channelId || '-';
}

function voiceDuration(value?: string) {
  return value || '0秒';
}

function sessionStatus(value: string) {
  if (value === 'closed') return <Tag color="green">已结束</Tag>;
  if (value === 'abnormal') return <Tag color="orange">异常补记</Tag>;
  return <Tag color="blue">在线中</Tag>;
}

function listRows(data: Record<string, unknown>) {
  return ((data.list || data.items || []) as Record<string, unknown>[]);
}

export default function KookVoiceStats() {
  const [data, setData] = useState<KookVoiceStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [form] = Form.useForm();

  const buildParams = (targetPage: number, targetPageSize: number) => {
    const values = form.getFieldsValue();
    const range = values.timeRange as DateLike[] | undefined;
    return {
      page: targetPage,
      pageSize: targetPageSize,
      startTime: range?.[0]?.format(dateTimeFormat),
      endTime: range?.[1]?.format(dateTimeFormat),
      channelId: values.channelId,
      userId: values.userId?.trim(),
    };
  };

  const load = async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    try {
      const res = await getKookVoiceStats(buildParams(targetPage, targetPageSize));
      setData(res);
      setPage(res.page || targetPage);
      setPageSize(res.pageSize || targetPageSize);
    } finally {
      setLoading(false);
    }
  };

  const loadChannels = async () => {
    try {
      const res = await listKookChannels({ page: 1, pageSize: 100 });
      setChannels(listRows(res).map((item) => ({
        value: String(item.channelId || item.channel_id || item.id || ''),
        label: String(item.name || item.channelName || item.channel_name || item.id || ''),
      })).filter((item) => item.value));
    } catch {
      setChannels([]);
    }
  };

  useEffect(() => {
    load(1);
    loadChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    form.resetFields();
    load(1);
  };

  const userColumns: ColumnsType<KookVoiceUsage> = [
    { title: '用户', render: (_, row) => displayName(row) },
    { title: 'KOOK 用户 ID', dataIndex: 'kookUserId', className: 'mono' },
    { title: '累计时长', dataIndex: 'durationText' },
    { title: '会话数', dataIndex: 'sessionCount', width: 100 },
    { title: '最近进入', dataIndex: 'lastJoinedAt', className: 'mono' },
  ];

  const channelColumns: ColumnsType<KookVoiceUsage> = [
    { title: '频道', render: (_, row) => channelName(row) },
    { title: '频道 ID', dataIndex: 'channelId', className: 'mono' },
    { title: '人员累计时长', dataIndex: 'durationText' },
    { title: '占用时长', dataIndex: 'occupiedDurationText', render: voiceDuration },
    { title: '空闲时长', dataIndex: 'idleDurationText', render: voiceDuration },
    { title: '会话数', dataIndex: 'sessionCount', width: 100 },
  ];

  const dailyColumns: ColumnsType<KookVoiceUsage> = [
    { title: '日期', dataIndex: 'date', className: 'mono', width: 130 },
    { title: '用户', render: (_, row) => displayName(row) },
    { title: 'KOOK 用户 ID', dataIndex: 'kookUserId', className: 'mono' },
    { title: '累计时长', dataIndex: 'durationText' },
    { title: '会话数', dataIndex: 'sessionCount', width: 100 },
  ];

  const sessionColumns: ColumnsType<KookVoiceSession> = [
    { title: '频道', render: (_, row) => channelName(row) },
    { title: '用户', render: (_, row) => displayName(row) },
    { title: '进入时间', dataIndex: 'joinedAt', className: 'mono' },
    { title: '退出时间', dataIndex: 'exitedAt', className: 'mono', render: (value) => value || '未退出' },
    { title: '本筛选段时长', dataIndex: 'durationText' },
    { title: '状态', dataIndex: 'status', render: sessionStatus },
  ];
  const userTableColumns = useTableColumnSettings('kook-voice-users', userColumns);
  const channelTableColumns = useTableColumnSettings('kook-voice-channels-v2', channelColumns);
  const dailyTableColumns = useTableColumnSettings('kook-voice-daily', dailyColumns);
  const sessionTableColumns = useTableColumnSettings('kook-voice-sessions', sessionColumns);
  const statsPagination = {
    pageSize: 10,
    pageSizeOptions,
    showSizeChanger: true,
    showTotal: (n: number) => `共 ${n} 条`,
  };

  const totals = useMemo(() => {
    const channelSeconds = data?.channelStats?.reduce((sum, item) => sum + (item.occupiedDurationSeconds || 0), 0) || 0;
    const activeCount = data?.sessions?.filter((item) => item.status === 'active').length || 0;
    return {
      userCount: data?.userStats?.length || 0,
      channelCount: data?.channelStats?.length || 0,
      activeCount,
      totalHours: Math.round(channelSeconds / 36) / 100,
    };
  }, [data]);

  return (
    <>
      <PageHeader
        title="KOOK 语音统计"
        description="按用户、频道、日期和时间段查看语音频道使用情况。"
      />

      <Card className="filter-card">
        <Form form={form} layout="inline" onFinish={() => load(1)}>
          <Form.Item name="timeRange">
            <DatePicker.RangePicker showTime format={dateTimeFormat} />
          </Form.Item>
          <Form.Item name="channelId">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="频道"
              style={{ width: 220 }}
              options={channels}
            />
          </Form.Item>
          <Form.Item name="userId">
            <Input allowClear placeholder="KOOK 用户 ID" style={{ width: 180 }} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
            <Button onClick={reset}>重置</Button>
          </Space>
        </Form>
      </Card>

      <Row gutter={[16, 16]} className="summary-row">
        <Col xs={24} sm={12} xl={6}>
          <Card className="summary-card blue">
            <Space align="start" className="summary-head"><UserOutlined /><Typography.Text>用户数</Typography.Text></Space>
            <Statistic value={totals.userCount} loading={loading} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="summary-card green">
            <Space align="start" className="summary-head"><TeamOutlined /><Typography.Text>频道数</Typography.Text></Space>
            <Statistic value={totals.channelCount} loading={loading} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="summary-card orange">
            <Space align="start" className="summary-head"><ClockCircleOutlined /><Typography.Text>占用小时</Typography.Text></Space>
            <Statistic value={totals.totalHours} precision={2} loading={loading} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="summary-card red">
            <Space align="start" className="summary-head"><BarChartOutlined /><Typography.Text>在线中</Typography.Text></Space>
            <Statistic value={totals.activeCount} loading={loading} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="用户维度使用时长" extra={userTableColumns.button}>
            <Table rowKey={(row) => row.kookUserId || displayName(row)} loading={loading} columns={userTableColumns.columns} dataSource={data?.userStats || []} pagination={statsPagination} scroll={{ x: userTableColumns.scrollX }} />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="频道维度总使用时长" extra={channelTableColumns.button}>
            <Table rowKey={(row) => row.channelId || channelName(row)} loading={loading} columns={channelTableColumns.columns} dataSource={data?.channelStats || []} pagination={statsPagination} scroll={{ x: channelTableColumns.scrollX }} />
          </Card>
        </Col>
        <Col xs={24}>
          <Card title="每日排行榜" extra={dailyTableColumns.button}>
            <Table rowKey={(row) => `${row.date}-${row.kookUserId}`} loading={loading} columns={dailyTableColumns.columns} dataSource={data?.dailyRanking || []} pagination={statsPagination} scroll={{ x: dailyTableColumns.scrollX }} />
          </Card>
        </Col>
        <Col xs={24}>
          <Card title="某个频道某天 / 某时间段在线记录" extra={sessionTableColumns.button}>
            <Table
              rowKey={(row) => String(row.id)}
              loading={loading}
              columns={sessionTableColumns.columns}
              dataSource={data?.sessions || []}
              scroll={{ x: sessionTableColumns.scrollX }}
              pagination={{
                total: data?.total || 0,
                current: page,
                pageSize,
                pageSizeOptions,
                showSizeChanger: true,
                onChange: load,
                showTotal: (n) => `共 ${n} 条`,
              }}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
