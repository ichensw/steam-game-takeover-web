import {
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Card, Col, Row, Skeleton, Space, Statistic, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { getDashboardSummary } from '../api/admin';
import PageHeader from '../components/PageHeader';

const metrics = [
  ['takeoverTotal', '接龙总数', <TeamOutlined />, 'orange'],
  ['userTotal', '微信用户', <UserOutlined />, 'blue'],
  ['pendingReportTotal', '待处理举报', <AlertOutlined />, 'red'],
  ['adminUserTotal', '后台用户', <CheckCircleOutlined />, 'green'],
];

export default function Dashboard() {
  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardSummary()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="运营概览"
        description="快速查看平台运营状态、用户规模和待处理事项。"
      />
      <div className="dashboard-grid motion-list">
        <Card className="dashboard-hero" style={{ '--i': 0 } as React.CSSProperties}>
          <div className="hero-orbit">
            <span />
            <strong>{loading ? '--' : data.takeoverTotal ?? 0}</strong>
          </div>
          <div>
            <Typography.Text className="panel-kicker">今日运营视图</Typography.Text>
            <Typography.Title level={2}>接龙运营台</Typography.Title>
            <Typography.Paragraph>
              重点关注接龙、用户和举报处理状态。高风险事项优先从右侧待办进入处理。
            </Typography.Paragraph>
          </div>
        </Card>

        <Card className="ops-panel" style={{ '--i': 1 } as React.CSSProperties}>
          <div className="panel-head">
            <Typography.Title level={4}>待处理</Typography.Title>
            <ClockCircleOutlined />
          </div>
          <div className="queue-item danger">
            <span>举报待处理</span>
            <strong>{loading ? '--' : data.pendingReportTotal ?? 0}</strong>
          </div>
          <div className="queue-item">
            <span>反馈待采纳</span>
            <strong>{loading ? '--' : data.pendingFeedbackTotal ?? 0}</strong>
          </div>
          <div className="queue-item">
            <span>系统状态</span>
            <strong>正常</strong>
          </div>
        </Card>

        <Row gutter={[16, 16]} className="summary-row">
          {metrics.map(([key, label, icon, tone], index) => (
            <Col xs={24} sm={12} xl={6} key={key as string}>
              <Card className={`summary-card ${tone}`}>
                <Space align="start" className="summary-head">
                  <span className="summary-icon">{icon}</span>
                  <Typography.Text>{label}</Typography.Text>
                </Space>
              {loading ? (
                <Skeleton active paragraph={false} />
              ) : (
                  <Statistic value={data[key as string] ?? 0} />
              )}
                <span className="summary-index mono">0{index + 1}</span>
            </Card>
          </Col>
        ))}
        </Row>
      </div>
    </>
  );
}
