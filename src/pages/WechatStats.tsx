import { BarChartOutlined, MessageOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { App as AntApp, Button, Card, Col, DatePicker, Form, Row, Select, Space, Statistic, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import {
  getWechatDailyStats,
  listWechatGroups,
  type WechatDailyStat,
  type WechatDailyStats,
  type WechatGroup,
  type WechatParticipantStat,
} from '../api/wechatBot';
import PageHeader from '../components/PageHeader';
import { useTableColumnSettings } from '../components/tableColumnSettings';
import { lastNDaysRange } from '../utils/wechatBot';

type DateLike = { format: (template: string) => string };

const emptyTotals = {
  messageCount: 0,
  participantCount: 0,
  groupCount: 0,
  messagesPerParticipant: 0,
};

export default function WechatStats() {
  const defaultRange = useMemo(() => lastNDaysRange(7), []);
  const [data, setData] = useState<WechatDailyStats | null>(null);
  const [groups, setGroups] = useState<WechatGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();

  const buildParams = () => {
    const values = form.getFieldsValue();
    const range = values.dateRange as DateLike[] | undefined;
    return {
      start: range?.[0]?.format('YYYY-MM-DD') || defaultRange.start,
      end: range?.[1]?.format('YYYY-MM-DD') || defaultRange.end,
      roomId: values.roomId as string | undefined,
    };
  };

  const load = async () => {
    setLoading(true);
    try {
      setData(await getWechatDailyStats(buildParams()));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '聊天统计加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void listWechatGroups()
      .then(setGroups)
      .catch((error) => message.error(error instanceof Error ? error.message : '群聊列表加载失败'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    form.resetFields();
    void load();
  };

  const dailyColumns: ColumnsType<WechatDailyStat> = [
    { title: '日期', dataIndex: 'date', width: 140, className: 'mono' },
    { title: '消息数', dataIndex: 'messageCount', width: 120, sorter: (a, b) => a.messageCount - b.messageCount },
    { title: '活跃人数', dataIndex: 'participantCount', width: 120, sorter: (a, b) => a.participantCount - b.participantCount },
    { title: '活跃群聊', dataIndex: 'groupCount', width: 120, sorter: (a, b) => a.groupCount - b.groupCount },
  ];
  const participantColumns: ColumnsType<WechatParticipantStat> = [
    { title: '排名', width: 80, render: (_, __, index) => index + 1 },
    {
      title: '聊天人员',
      render: (_, row) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text>{row.senderName || row.senderWxid}</Typography.Text>
          <Typography.Text type="secondary" className="mono">{row.senderWxid}</Typography.Text>
        </Space>
      ),
    },
    { title: '消息数', dataIndex: 'messageCount', width: 120 },
    { title: '活跃天数', dataIndex: 'activeDays', width: 120 },
    { title: '参与群聊', dataIndex: 'groupCount', width: 120 },
  ];
  const dailyTable = useTableColumnSettings('wechat-stats-daily', dailyColumns);
  const participantTable = useTableColumnSettings('wechat-stats-participants', participantColumns);
  const totals = data?.totals || emptyTotals;

  return (
    <>
      <PageHeader title="微信聊天统计" description="查看指定日期范围内的群聊活跃度和聊天人员排行。" />
      <Card className="filter-card">
        <Form
          form={form}
          layout="inline"
          initialValues={{ dateRange: [dayjs(defaultRange.start), dayjs(defaultRange.end)] }}
          onFinish={load}
        >
          <Form.Item name="roomId">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="全部群聊"
              style={{ width: 240 }}
              options={groups.map((group) => ({ value: group.roomId, label: group.roomName || group.roomId }))}
            />
          </Form.Item>
          <Form.Item name="dateRange">
            <DatePicker.RangePicker allowClear={false} format="YYYY-MM-DD" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">查询</Button>
            <Button onClick={reset}>重置</Button>
          </Space>
        </Form>
      </Card>

      <Row gutter={[16, 16]} className="summary-row">
        <Col xs={12} xl={6}>
          <Card className="summary-card blue">
            <Space className="summary-head"><MessageOutlined /><Typography.Text>总消息数</Typography.Text></Space>
            <Statistic value={totals.messageCount} loading={loading} />
          </Card>
        </Col>
        <Col xs={12} xl={6}>
          <Card className="summary-card green">
            <Space className="summary-head"><UserOutlined /><Typography.Text>活跃人数</Typography.Text></Space>
            <Statistic value={totals.participantCount} loading={loading} />
          </Card>
        </Col>
        <Col xs={12} xl={6}>
          <Card className="summary-card orange">
            <Space className="summary-head"><TeamOutlined /><Typography.Text>活跃群聊</Typography.Text></Space>
            <Statistic value={totals.groupCount} loading={loading} />
          </Card>
        </Col>
        <Col xs={12} xl={6}>
          <Card className="summary-card red">
            <Space className="summary-head"><BarChartOutlined /><Typography.Text>人均消息</Typography.Text></Space>
            <Statistic value={totals.messagesPerParticipant} precision={2} loading={loading} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card title="每日趋势" extra={dailyTable.button}>
            <Table rowKey="date" loading={loading} columns={dailyTable.columns} dataSource={data?.daily || []} pagination={false} scroll={{ x: dailyTable.scrollX }} />
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card title="聊天人员排行" extra={participantTable.button}>
            <Table rowKey="senderWxid" loading={loading} columns={participantTable.columns} dataSource={data?.participants || []} pagination={{ pageSize: 20, showSizeChanger: false }} scroll={{ x: participantTable.scrollX }} />
          </Card>
        </Col>
      </Row>
    </>
  );
}
