import {
  AlertOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  MessageOutlined,
  NodeIndexOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Empty, List, Progress, Row, Skeleton, Space, Statistic, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getDashboardSummary,
  getKookVoiceStats,
  listFeedbacks,
  listKookChannels,
  listKookChannelUsageSummary,
  listKookMembers,
  listReports,
  listTakeovers,
  type KookChannelUsage,
  type KookVoiceStats,
  type KookVoiceUsage,
  type PageResult,
} from '../api/admin';
import PageHeader from '../components/PageHeader';

type Summary = Record<string, number>;
type PlainRow = Record<string, unknown>;
type DashboardData = {
  summary: Summary;
  recentTakeovers: PlainRow[];
  pendingReports: PlainRow[];
  pendingFeedbacks: PlainRow[];
  kookMemberTotal: number;
  kookUsage: KookChannelUsage[];
  kookChannelNames: Record<string, string>;
  voiceStats: KookVoiceStats | null;
};

const emptyData: DashboardData = {
  summary: {},
  recentTakeovers: [],
  pendingReports: [],
  pendingFeedbacks: [],
  kookMemberTotal: 0,
  kookUsage: [],
  kookChannelNames: {},
  voiceStats: null,
};

function pageItems<T extends PlainRow>(value?: PageResult<T>) {
  return value?.list || value?.items || [];
}

function pageTotal(value?: PageResult<PlainRow>) {
  return Number(value?.total || 0);
}

function shortNumber(value: unknown) {
  const count = Number(value || 0);
  if (count >= 10000) return `${Math.round(count / 100) / 100}w`;
  return count;
}

function hours(seconds: number) {
  return Math.round((seconds / 3600) * 10) / 10;
}

function displayName(row: KookVoiceUsage) {
  return row.nickname || row.username || row.kookUserId || '-';
}

function rowText(row: PlainRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') return String(value);
  }
  return '-';
}

function todayRangeText(range?: { startTime: string; endTime: string }) {
  if (!range?.startTime || !range?.endTime) return '今日';
  return `${range.startTime.slice(11, 16)} - ${range.endTime.slice(11, 16)}`;
}

function topUsagePercent(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(4, Math.round((value / max) * 100));
}

function listRows(data: Record<string, unknown>) {
  return ((data.list || data.items || []) as PlainRow[]);
}

function channelId(row: PlainRow) {
  return String(row.id || row.channel_id || row.channelId || '');
}

function channelName(row: PlainRow) {
  return String(row.name || row.channelName || row.channel_name || channelId(row));
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const [
        summary,
        takeovers,
        reports,
        feedbacks,
        kookMembers,
        kookChannels,
        kookUsage,
        voiceStats,
      ] = await Promise.allSettled([
        getDashboardSummary(),
        listTakeovers({ page: 1, pageSize: 6, sortField: 'createdAt', sortOrder: 'desc' }),
        listReports({ page: 1, pageSize: 5, state: 'pending' }),
        listFeedbacks({ page: 1, page_size: 5, status: 1 }),
        listKookMembers({ page: 1, pageSize: 1 }),
        listKookChannels({ page: 1, pageSize: 500 }),
        listKookChannelUsageSummary({}),
        getKookVoiceStats({ page: 1, pageSize: 6 }),
      ]);
      if (!mounted) return;
      setData({
        summary: summary.status === 'fulfilled' ? summary.value : {},
        recentTakeovers: takeovers.status === 'fulfilled' ? pageItems(takeovers.value) : [],
        pendingReports: reports.status === 'fulfilled' ? pageItems(reports.value) : [],
        pendingFeedbacks: feedbacks.status === 'fulfilled' ? pageItems(feedbacks.value) : [],
        kookMemberTotal: kookMembers.status === 'fulfilled' ? pageTotal(kookMembers.value) : 0,
        kookChannelNames: kookChannels.status === 'fulfilled'
          ? Object.fromEntries(listRows(kookChannels.value).map((row) => [channelId(row), channelName(row)]).filter(([id]) => id))
          : {},
        kookUsage: kookUsage.status === 'fulfilled' ? kookUsage.value.list || [] : [],
        voiceStats: voiceStats.status === 'fulfilled' ? voiceStats.value : null,
      });
      setLoading(false);
    }
    load();
    const timer = window.setInterval(load, 30000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const computed = useMemo(() => {
    const totalVoiceSeconds = data.voiceStats?.channelStats?.reduce((sum, item) => sum + item.durationSeconds, 0) || 0;
    const activeUsers = data.kookUsage.reduce((sum, item) => sum + Number(item.activeUserCount || 0), 0);
    const activeChannels = data.kookUsage.filter((item) => Number(item.activeUserCount || 0) > 0).length;
    const maxChannelSeconds = Math.max(...data.kookUsage.map((item) => Number(item.durationSeconds || 0)), 0);
    const maxUserSeconds = Math.max(...(data.voiceStats?.userStats || []).map((item) => Number(item.durationSeconds || 0)), 0);
    return {
      totalVoiceSeconds,
      totalVoiceHours: hours(totalVoiceSeconds),
      activeUsers,
      activeChannels,
      maxChannelSeconds,
      maxUserSeconds,
      urgentTotal: Number(data.summary.pendingReportTotal || 0) + Number(data.summary.pendingFeedbackTotal || 0),
    };
  }, [data]);

  const topChannels = data.kookUsage
    .filter((item) => Number(item.durationSeconds || 0) > 0 || Number(item.activeUserCount || 0) > 0)
    .sort((a, b) => Number(b.activeUserCount || 0) - Number(a.activeUserCount || 0) || Number(b.durationSeconds || 0) - Number(a.durationSeconds || 0))
    .slice(0, 5);
  const topUsers = [...(data.voiceStats?.userStats || [])]
    .sort((a, b) => b.durationSeconds - a.durationSeconds)
    .slice(0, 5);

  const metrics = [
    { key: 'takeoverTotal', label: '接龙总数', value: data.summary.takeoverTotal, icon: <TeamOutlined />, tone: 'orange', to: '/takeovers' },
    { key: 'userTotal', label: '微信用户', value: data.summary.userTotal, icon: <UserOutlined />, tone: 'blue', to: '/users' },
    { key: 'voiceHours', label: '今日语音小时', value: computed.totalVoiceHours, icon: <ClockCircleOutlined />, tone: 'green', to: '/kook-voice-stats', precision: 1 },
    { key: 'activeUsers', label: '当前语音在线', value: computed.activeUsers, icon: <FireOutlined />, tone: 'red', to: '/kook-channels' },
    { key: 'kookMembers', label: 'KOOK 成员', value: data.kookMemberTotal, icon: <NodeIndexOutlined />, tone: 'blue', to: '/kook-members' },
    { key: 'pendingReportTotal', label: '待处理举报', value: data.summary.pendingReportTotal, icon: <AlertOutlined />, tone: 'red', to: '/reports' },
    { key: 'pendingFeedbackTotal', label: '待处理反馈', value: data.summary.pendingFeedbackTotal, icon: <MessageOutlined />, tone: 'orange', to: '/feedbacks' },
    { key: 'adminUserTotal', label: '后台账号', value: data.summary.adminUserTotal, icon: <CheckCircleOutlined />, tone: 'green', to: '/admin-users' },
  ];

  return (
    <>
      <PageHeader
        title="运营中枢"
        description="集中查看接龙、用户、举报反馈和 KOOK 语音状态。"
        extra={<Button onClick={() => window.location.reload()}>刷新数据</Button>}
      />

      <div className="dashboard-v2 motion-list">
        <Card className="dashboard-command" style={{ '--i': 0 } as React.CSSProperties}>
          <div>
            <Typography.Text className="panel-kicker">实时运营视图</Typography.Text>
            <Typography.Title level={2}>今日重点：{computed.urgentTotal > 0 ? `${computed.urgentTotal} 个事项待处理` : '暂无高优先级待办'}</Typography.Title>
            <Typography.Paragraph>
              {loading ? '正在同步平台和 KOOK 数据。' : `KOOK 当前 ${computed.activeChannels} 个语音频道有人在线，今日累计 ${computed.totalVoiceHours} 小时。`}
            </Typography.Paragraph>
            <Space wrap>
              <Link to="/reports"><Button type="primary">处理举报</Button></Link>
              <Link to="/kook-channels"><Button>查看 KOOK 频道</Button></Link>
              <Link to="/kook-voice-stats"><Button>语音统计</Button></Link>
            </Space>
          </div>
          <div className="dashboard-pulse">
            <span>{loading ? '--' : computed.activeUsers}</span>
            <small>语音在线人数</small>
          </div>
        </Card>

        <Card className="ops-panel dashboard-workbench" style={{ '--i': 1 } as React.CSSProperties}>
          <div className="panel-head">
            <Typography.Title level={4}>待处理工作台</Typography.Title>
            <AlertOutlined />
          </div>
          <Link className="queue-link danger" to="/reports">
            <span>举报待处理</span>
            <strong>{loading ? '--' : data.summary.pendingReportTotal ?? 0}</strong>
          </Link>
          <Link className="queue-link" to="/feedbacks">
            <span>反馈待处理</span>
            <strong>{loading ? '--' : data.summary.pendingFeedbackTotal ?? 0}</strong>
          </Link>
          <Link className="queue-link" to="/kook-members">
            <span>KOOK 成员规模</span>
            <strong>{loading ? '--' : shortNumber(data.kookMemberTotal)}</strong>
          </Link>
        </Card>

        <Row gutter={[16, 16]} className="dashboard-metrics">
          {metrics.map((item, index) => (
            <Col xs={24} sm={12} lg={6} xxl={3} key={item.key}>
              <Link to={item.to} className="metric-link">
                <Card className={`summary-card ${item.tone}`} style={{ '--i': index + 2 } as React.CSSProperties}>
                  <Space align="start" className="summary-head">
                    <span className="summary-icon">{item.icon}</span>
                    <Typography.Text>{item.label}</Typography.Text>
                  </Space>
                  {loading ? <Skeleton active paragraph={false} /> : <Statistic value={item.value ?? 0} precision={item.precision || 0} />}
                </Card>
              </Link>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]} className="dashboard-main-row">
          <Col xs={24} xl={14}>
            <Card
              title="KOOK 频道实时状态"
              extra={<Typography.Text type="secondary">{todayRangeText(data.voiceStats?.range)}</Typography.Text>}
              className="dashboard-section"
            >
              {loading ? <Skeleton active /> : topChannels.length ? (
                <Space direction="vertical" className="dashboard-rank-list">
                  {topChannels.map((item, index) => (
                    <div className="rank-row" key={item.channelId}>
                      <span className="rank-index">{index + 1}</span>
                      <div className="rank-main">
                        <div className="rank-title">
                          <Typography.Text>{data.kookChannelNames[item.channelId] || item.channelId}</Typography.Text>
                          <Space size={6}>
                            <Tag color={item.activeUserCount ? 'green' : undefined}>{item.activeUserCount || 0} 人在线</Tag>
                            <Tag>{item.sessionCount || 0} 次</Tag>
                          </Space>
                        </div>
                        <Progress percent={topUsagePercent(item.durationSeconds, computed.maxChannelSeconds)} showInfo={false} />
                      </div>
                      <strong>{item.durationText || '0秒'}</strong>
                    </div>
                  ))}
                </Space>
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无 KOOK 使用数据" />}
            </Card>
          </Col>

          <Col xs={24} xl={10}>
            <Card title="今日用户语音排行" className="dashboard-section">
              {loading ? <Skeleton active /> : topUsers.length ? (
                <Space direction="vertical" className="dashboard-rank-list compact">
                  {topUsers.map((item, index) => (
                    <div className="rank-row" key={item.kookUserId || index}>
                      <span className="rank-index">{index + 1}</span>
                      <div className="rank-main">
                        <div className="rank-title">
                          <Typography.Text>{displayName(item)}</Typography.Text>
                          <Tag>{item.sessionCount || 0} 次</Tag>
                        </div>
                        <Progress percent={topUsagePercent(item.durationSeconds, computed.maxUserSeconds)} showInfo={false} />
                      </div>
                      <strong>{item.durationText}</strong>
                    </div>
                  ))}
                </Space>
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无用户语音数据" />}
            </Card>
          </Col>

          <Col xs={24} xl={12}>
            <Card title="最近接龙" extra={<Link to="/takeovers">查看全部</Link>} className="dashboard-section">
              <List
                loading={loading}
                dataSource={data.recentTakeovers}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无接龙" /> }}
                renderItem={(row) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Typography.Text ellipsis>{rowText(row, 'title')}</Typography.Text>}
                      description={`${rowText(row, 'creatorName', 'creatorNickname')} · ${rowText(row, 'scheduleText', 'startDate')}`}
                    />
                    <Tag>{rowText(row, 'statusLabel', 'status')}</Tag>
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          <Col xs={24} xl={12}>
            <Card title="待办明细" className="dashboard-section">
              <Row gutter={[14, 14]}>
                <Col xs={24} md={12}>
                  <Typography.Text type="secondary">待处理举报</Typography.Text>
                  <List
                    size="small"
                    dataSource={data.pendingReports}
                    locale={{ emptyText: '暂无举报' }}
                    renderItem={(row) => (
                      <List.Item>
                        <Typography.Text ellipsis>{rowText(row, 'content', 'takeoverTitle')}</Typography.Text>
                      </List.Item>
                    )}
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Typography.Text type="secondary">待处理反馈</Typography.Text>
                  <List
                    size="small"
                    dataSource={data.pendingFeedbacks}
                    locale={{ emptyText: '暂无反馈' }}
                    renderItem={(row) => (
                      <List.Item>
                        <Typography.Text ellipsis>{rowText(row, 'content', 'contact', 'nickname')}</Typography.Text>
                      </List.Item>
                    )}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
}
