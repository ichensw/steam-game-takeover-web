import { Button, Card, DatePicker, Form, Input, Select, Space, Table, Tag, Tooltip, Typography, App as AntApp } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { listWechatGroups, listWechatMessages, type WechatGroup, type WechatMessage, type WechatMessageQuery } from '../api/wechatBot';
import PageHeader from '../components/PageHeader';
import { useTableColumnSettings } from '../components/tableColumnSettings';
import { pageSizeOptions } from '../utils/pagination';

type DateLike = { format: (template: string) => string };

const messageTypeOptions = [
  { value: 1, label: '文本' },
  { value: 3, label: '图片' },
  { value: 34, label: '语音' },
  { value: 43, label: '视频' },
  { value: 47, label: '表情' },
  { value: 49, label: '卡片 / 文件' },
];

const messageTypeLabel = (value: number) => messageTypeOptions.find((item) => item.value === value)?.label || `类型 ${value}`;

export default function WechatMessages() {
  const [rows, setRows] = useState<WechatMessage[]>([]);
  const [groups, setGroups] = useState<WechatGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();

  const buildParams = (targetPage: number, targetPageSize: number): WechatMessageQuery => {
    const values = form.getFieldsValue();
    const range = values.timeRange as DateLike[] | undefined;
    return {
      roomId: values.roomId,
      sender: values.sender?.trim(),
      keyword: values.keyword?.trim(),
      msgType: values.msgType,
      start: range?.[0]?.format('YYYY-MM-DDTHH:mm:ss'),
      end: range?.[1]?.format('YYYY-MM-DDTHH:mm:ss'),
      page: targetPage,
      pageSize: targetPageSize,
    };
  };

  const load = async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    try {
      const result = await listWechatMessages(buildParams(targetPage, targetPageSize));
      setRows(result.data || []);
      setPage(result.pagination?.page || targetPage);
      setPageSize(result.pagination?.pageSize || targetPageSize);
      setTotal(result.pagination?.totalItems || 0);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '消息加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      setGroups(await listWechatGroups());
    } catch (error) {
      message.error(error instanceof Error ? error.message : '群聊列表加载失败');
    }
  };

  useEffect(() => {
    void Promise.all([load(1), loadGroups()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo<ColumnsType<WechatMessage>>(() => [
    { title: '时间', dataIndex: 'createdAt', width: 180, className: 'mono' },
    {
      title: '群聊',
      dataIndex: 'roomId',
      width: 220,
      render: (value) => groups.find((group) => group.roomId === value)?.roomName || <Typography.Text className="mono">{value}</Typography.Text>,
    },
    {
      title: '发送人',
      width: 180,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{row.senderName || '-'}</Typography.Text>
          <Typography.Text type="secondary" className="mono">{row.senderWxid}</Typography.Text>
        </Space>
      ),
    },
    { title: '类型', dataIndex: 'msgType', width: 110, render: (value) => <Tag>{messageTypeLabel(value)}</Tag> },
    {
      title: '内容',
      dataIndex: 'content',
      render: (value, row) => {
        const content = value || row.xmlContent || row.mediaUrl || '-';
        return <Tooltip title={content}><Typography.Text ellipsis style={{ maxWidth: 520 }}>{content}</Typography.Text></Tooltip>;
      },
    },
    { title: '消息 ID', dataIndex: 'msgId', width: 180, className: 'mono', ellipsis: true },
  ], [groups]);
  const tableColumns = useTableColumnSettings('wechat-messages', columns);

  const reset = () => {
    form.resetFields();
    void load(1);
  };

  return (
    <>
      <PageHeader title="微信消息查询" description="按群聊、发送人、关键词和时间范围检索机器人收到的消息。" extra={tableColumns.button} />
      <Card className="filter-card">
        <Form form={form} layout="inline" onFinish={() => load(1)}>
          <Form.Item name="roomId">
            <Select allowClear showSearch optionFilterProp="label" placeholder="群聊" style={{ width: 220 }} options={groups.map((group) => ({ value: group.roomId, label: group.roomName || group.roomId }))} />
          </Form.Item>
          <Form.Item name="sender"><Input allowClear placeholder="发送人 / wxid" /></Form.Item>
          <Form.Item name="keyword"><Input.Search allowClear placeholder="消息关键词" /></Form.Item>
          <Form.Item name="msgType"><Select allowClear placeholder="消息类型" style={{ width: 140 }} options={messageTypeOptions} /></Form.Item>
          <Form.Item name="timeRange"><DatePicker.RangePicker showTime format="YYYY-MM-DD HH:mm:ss" /></Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">查询</Button>
            <Button onClick={reset}>重置</Button>
          </Space>
        </Form>
      </Card>
      <Table
        rowKey="msgId"
        loading={loading}
        columns={tableColumns.columns}
        dataSource={rows}
        scroll={{ x: tableColumns.scrollX }}
        pagination={{ total, current: page, pageSize, pageSizeOptions, showSizeChanger: true, onChange: load, showTotal: (count) => `共 ${count} 条` }}
      />
    </>
  );
}
