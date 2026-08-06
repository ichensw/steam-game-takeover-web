import {
  AlertOutlined,
  TeamOutlined,
  UserOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Empty, Progress, Row, Skeleton, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getDashboardSummary,
  type DashboardSummary,
} from '../api/admin';
import PageHeader from '../components/PageHeader';

type PlainRow = Record<string, unknown>;
type DashboardData = Omit<DashboardSummary, 'voiceStats'> & { voiceStats: DashboardSummary['voiceStats'] | null };

const emptyData: DashboardData = {
  summary: {},
  recentTakeovers: [],
  kookMemberTotal: 0,
  kookUsage: [],
  voiceStats: null,
};

function shortNumber(value: unknown) {
  const count = Number(value || 0);
  if (count >= 10000) return `${Math.round(count / 100) / 100}w`;
  return count;
}

function hours(seconds: number) {
  return Math.round((seconds / 3600) * 10) / 10;
}

function displayName(row: { nickname?: string; username?: string; kookUserId?: string }) {
  return row.nickname || row.username || row.kookUserId || '-';
}

function rowText(row: PlainRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') return String(value);
  }
  return '-';
}

function takeoverCountText(row: PlainRow) {
  return `${rowText(row, 'joinedCount', 'joined_count')} / ${rowText(row, 'participantLimit', 'participant_limit')}`;
}

function todayRangeText(range?: { startTime: string; endTime: string }) {
  if (!range?.startTime || !range?.endTime) return '今日';
  return `${range.startTime.slice(11, 16)} - ${range.endTime.slice(11, 16)}`;
}

function topUsagePercent(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(4, Math.round((value / max) * 100));
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let loadingRequest = false;
    let hasLoaded = false;
    async function load() {
      if (loadingRequest) return;
      loadingRequest = true;
      if (!hasLoaded) setLoading(true);
      try {
        const dashboard = await getDashboardSummary();
        if (mounted) setData(dashboard);
        hasLoaded = true;
      } finally {
        loadingRequest = false;
        if (mounted) setLoading(false);
      }
    }
    load();
    const timer = window.setInterval(load, 30000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const computed = useMemo(() => {
    const totalVoiceSeconds = data.voiceStats?.totalDurationSeconds || 0;
    const activeUsers = data.voiceStats?.activeUserTotal || 0;
    const activeChannels = data.voiceStats?.activeChannelTotal || 0;
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
    { key: 'takeoverTotal', label: '接龙总数', value: data.summary.takeoverTotal, icon: <TeamOutlined />, tone: 'orange', to: '/takeovers', hint: '平台累计接龙' },
    { key: 'userTotal', label: '微信用户', value: data.summary.userTotal, icon: <UserOutlined />, tone: 'blue', to: '/users', hint: '用户池规模' },
    { key: 'kookMembers', label: 'KOOK 成员', value: data.kookMemberTotal, icon: <NodeIndexOutlined />, tone: 'green', to: '/kook-members', hint: '社区成员' },
  ];

  const takeoverColumns: ColumnsType<PlainRow> = [
    {
      title: '标题',
      width: 240,
      render: (_, row) => {
        const id = rowText(row, 'id', 'takeoverId');
        const title = rowText(row, 'title');
        const content = <Typography.Text ellipsis>{title}</Typography.Text>;
        return id === '-' ? content : <Link to={`/takeovers/${id}`}>{content}</Link>;
      },
    },
    { title: '状态', width: 110, render: (_, row) => <Tag>{rowText(row, 'statusLabel', 'status')}</Tag> },
    { title: '人数', width: 110, render: (_, row) => takeoverCountText(row) },
    { title: '活动时间', width: 190, className: 'mono', render: (_, row) => rowText(row, 'scheduleText', 'schedule_text', 'startDate') },
    { title: '创建人', width: 140, render: (_, row) => rowText(row, 'creatorName', 'creatorNickname', 'creator_name') },
    { title: 'KOOK 频道', width: 160, render: (_, row) => rowText(row, 'kookChannelName', 'kook_channel_name') },
    { title: '创建时间', width: 170, className: 'mono', render: (_, row) => rowText(row, 'createdAt', 'created_at') },
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
          <Link className="queue-link" to="/admin-users">
            <span>后台账号</span>
            <strong>{loading ? '--' : data.summary.adminUserTotal ?? 0}</strong>
          </Link>
          <Link className="queue-link" to="/kook-members">
            <span>KOOK 成员规模</span>
            <strong>{loading ? '--' : shortNumber(data.kookMemberTotal)}</strong>
          </Link>
        </Card>

        <Row className="dashboard-metrics">
          {metrics.map((item, index) => (
            <Col xs={24} md={8} key={item.key}>
              <Link to={item.to} className="metric-link">
                <Card className={`summary-card ${item.tone}`} style={{ '--i': index + 2 } as React.CSSProperties}>
                  <div className="summary-card-top">
                    <span className="summary-icon">{item.icon}</span>
                    <Typography.Text>{item.label}</Typography.Text>
                  </div>
                  {loading ? <Skeleton active paragraph={false} /> : <Statistic value={item.value ?? 0} />}
                  <Typography.Text className="summary-hint">{item.hint}</Typography.Text>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]} className="dashboard-main-row">
          <Col xs={24} xl={12}>
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
                          <Typography.Text>{item.channelName || item.channelId}</Typography.Text>
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

          <Col xs={24} xl={12}>
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

          <Col xs={24}>
            <Card title="最近接龙" extra={<Link to="/takeovers">查看全部</Link>} className="dashboard-section">
              <Table<PlainRow>
                className="dashboard-takeover-table"
                loading={loading}
                rowKey={(row) => rowText(row, 'id', 'takeoverId')}
                size="middle"
                pagination={false}
                columns={takeoverColumns}
                dataSource={data.recentTakeovers}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无接龙" /> }}
                scroll={{ x: 1120 }}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
}
