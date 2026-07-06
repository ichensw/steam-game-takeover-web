import { Card, Col, Row, Skeleton, Statistic } from 'antd';
import { useEffect, useState } from 'react';
import { getDashboardSummary } from '../api/admin';
import PageHeader from '../components/PageHeader';

const metrics = [
  ['takeoverTotal', '接龙总数'],
  ['userTotal', '用户总数'],
  ['pendingReportTotal', '待处理举报'],
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
        title="控制台"
        description="快速查看平台运营状态，后续可继续补充趋势图和待办队列。"
      />
      <Row gutter={[16, 16]} className="motion-list">
        {metrics.map(([key, label], index) => (
          <Col xs={24} sm={12} xl={6} key={key} style={{ '--i': index } as React.CSSProperties}>
            <Card>
              {loading ? (
                <Skeleton active paragraph={false} />
              ) : (
                <Statistic title={label} value={data[key] ?? 0} />
              )}
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}
