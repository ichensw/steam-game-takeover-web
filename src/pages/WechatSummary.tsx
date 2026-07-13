import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Select, Space, Spin, Typography, App as AntApp } from 'antd';
import { useEffect, useState } from 'react';
import { createWechatSummary, listWechatGroups, type WechatGroup, type WechatSummary } from '../api/wechatBot';
import PageHeader from '../components/PageHeader';
import { summaryPayload, todayString, type SummaryFormValues } from '../utils/wechatBot';
import { exportWechatSummaryImage } from '../utils/wechatSummaryImage';

const periodOptions = [
  { value: 'day', label: '全天' },
  { value: 'morning', label: '上午（00:00-12:00）' },
  { value: 'afternoon', label: '下午（12:00-18:00）' },
  { value: 'custom', label: '自定义时间段' },
];

export default function WechatSummary() {
  const [groups, setGroups] = useState<WechatGroup[]>([]);
  const [result, setResult] = useState<WechatSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [form] = Form.useForm<SummaryFormValues>();
  const period = Form.useWatch('period', form);
  const { message } = AntApp.useApp();

  useEffect(() => {
    listWechatGroups().then(setGroups).catch((error) => {
      message.error(error instanceof Error ? error.message : '群聊列表加载失败');
    });
  }, [message]);

  const submit = async (values: SummaryFormValues) => {
    setLoading(true);
    try {
      const data = await createWechatSummary(summaryPayload(values));
      setResult(data);
      message.success('总结已生成');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '总结生成失败');
    } finally {
      setLoading(false);
    }
  };

  const exportImage = async () => {
    if (!result?.summary) return;
    setExporting(true);
    try {
      const meta = `${result.messageCount || 0} 条文本消息${result.truncated ? ' · 已达到总结上限' : ''}`;
      await exportWechatSummaryImage(result.summary, meta);
      message.success('图片已导出');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '图片导出失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="微信 AI 总结"
        description="按群聊和时间范围归纳主要话题、重要信息与群内热点。"
        extra={<Button icon={<DownloadOutlined />} disabled={!result?.summary} loading={exporting} onClick={exportImage}>导出图片</Button>}
      />
      <Card className="filter-card">
        <Form form={form} layout="inline" initialValues={{ date: todayString(), period: 'day' }} onFinish={submit}>
          <Form.Item name="roomId">
            <Select allowClear showSearch optionFilterProp="label" placeholder="全部群聊" style={{ width: 220 }} options={groups.map((group) => ({ value: group.roomId, label: group.roomName || group.roomId }))} />
          </Form.Item>
          {period !== 'custom' ? <Form.Item name="date"><Input type="date" aria-label="总结日期" /></Form.Item> : null}
          <Form.Item name="period"><Select style={{ width: 210 }} options={periodOptions} /></Form.Item>
          {period === 'custom' ? (
            <>
              <Form.Item name="start" rules={[{ required: true, message: '请选择开始时间' }]}><Input type="datetime-local" aria-label="开始时间" /></Form.Item>
              <Form.Item name="end" rules={[{ required: true, message: '请选择结束时间' }]}><Input type="datetime-local" aria-label="结束时间" /></Form.Item>
            </>
          ) : null}
          <Button type="primary" htmlType="submit" icon={<FileTextOutlined />} loading={loading}>生成总结</Button>
        </Form>
      </Card>
      {result?.truncated ? <Alert type="warning" showIcon message="消息数量较多，本次总结已达到配置上限。" className="wechat-summary-alert" /> : null}
      <Card className="wechat-summary-output" aria-live="polite">
        <Spin spinning={loading}>
          {result ? (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Typography.Text type="secondary">{result.messageCount || 0} 条文本消息</Typography.Text>
              <Typography.Paragraph className="wechat-summary-text">{result.summary}</Typography.Paragraph>
            </Space>
          ) : (
            <div className="wechat-summary-empty">
              <FileTextOutlined />
              <Typography.Text type="secondary">选择范围后生成群聊总结</Typography.Text>
            </div>
          )}
        </Spin>
      </Card>
    </>
  );
}
