import { FileSearchOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Descriptions, Form, Image, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography, App as AntApp } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { listWechatGroups, listWechatMessages, type WechatGroup, type WechatMessage, type WechatMessageQuery } from '../api/wechatBot';
import PageHeader from '../components/PageHeader';
import { useTableColumnSettings } from '../components/tableColumnSettings';
import { pageSizeOptions } from '../utils/pagination';
import { formatWechatTime, wechatMessageTypeLabel, wechatMessageTypes } from '../utils/wechatBot';

type DateLike = { format: (template: string) => string };

function isImageMessage(row: WechatMessage) {
  return row.msgType === 3 || Boolean(row.mediaUrl || row.mediaLocalPath || row.mediaOssKey);
}

function messagePreview(row: WechatMessage) {
  return row.content || row.xmlContent || row.mediaUrl || row.mediaLocalPath || '-';
}

function copyableValue(value?: string) {
  if (!value) return '-';
  return (
    <Typography.Text className="mono" copyable={{ text: value }} style={{ wordBreak: 'break-all' }}>
      {value}
    </Typography.Text>
  );
}

function rawBlock(value?: string) {
  if (!value) return null;
  return (
    <Typography.Paragraph
      className="wechat-original-message mono"
      copyable={{ text: value }}
      style={{
        maxHeight: 260,
        overflow: 'auto',
        margin: 0,
        padding: 12,
        border: '1px solid var(--line)',
        borderRadius: 8,
        background: 'var(--panel-2)',
      }}
    >
      {value}
    </Typography.Paragraph>
  );
}

export default function WechatMessages() {
  const [rows, setRows] = useState<WechatMessage[]>([]);
  const [groups, setGroups] = useState<WechatGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [imageData, setImageData] = useState<WechatMessage | null>(null);
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
    { title: '时间', dataIndex: 'createdAt', width: 180, className: 'mono', render: formatWechatTime },
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
    { title: '类型', dataIndex: 'msgType', width: 110, render: (value) => <Tag>{wechatMessageTypeLabel(value)}</Tag> },
    {
      title: '内容',
      dataIndex: 'content',
      render: (_, row) => {
        const content = messagePreview(row);
        if (isImageMessage(row)) {
          return (
            <Space align="center" size={10} style={{ maxWidth: 620 }}>
              {row.mediaUrl ? (
                <Image
                  src={row.mediaUrl}
                  width={48}
                  height={48}
                  alt="微信图片"
                  style={{ objectFit: 'cover', borderRadius: 6 }}
                />
              ) : null}
              <Space direction="vertical" size={2} style={{ minWidth: 0 }}>
                <Space size={8}>
                  <Button size="small" icon={<FileSearchOutlined />} onClick={() => setImageData(row)}>
                    查看数据
                  </Button>
                  {row.mediaUrl ? (
                    <Typography.Link href={row.mediaUrl} target="_blank" rel="noreferrer">
                      打开图片
                    </Typography.Link>
                  ) : null}
                </Space>
                <Tooltip title={content}>
                  <Typography.Text type="secondary" ellipsis style={{ maxWidth: 420 }}>
                    {content}
                  </Typography.Text>
                </Tooltip>
              </Space>
            </Space>
          );
        }
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
          <Form.Item name="msgType"><Select allowClear placeholder="消息类型" style={{ width: 140 }} options={wechatMessageTypes} /></Form.Item>
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
      <Modal
        title="图片数据"
        open={!!imageData}
        footer={null}
        width={860}
        onCancel={() => setImageData(null)}
      >
        {imageData && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {imageData.mediaUrl ? (
              <Image
                src={imageData.mediaUrl}
                alt="微信图片预览"
                style={{ maxWidth: '100%', maxHeight: 420, objectFit: 'contain' }}
              />
            ) : null}
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="消息 ID">{copyableValue(imageData.msgId)}</Descriptions.Item>
              <Descriptions.Item label="群聊 ID">{copyableValue(imageData.roomId)}</Descriptions.Item>
              <Descriptions.Item label="发送人">
                <Space direction="vertical" size={0}>
                  <Typography.Text>{imageData.senderName || '-'}</Typography.Text>
                  {copyableValue(imageData.senderWxid)}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="消息类型">{wechatMessageTypeLabel(imageData.msgType)}</Descriptions.Item>
              <Descriptions.Item label="发送时间">{formatWechatTime(imageData.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="图片 URL">{copyableValue(imageData.mediaUrl)}</Descriptions.Item>
              <Descriptions.Item label="本地路径">{copyableValue(imageData.mediaLocalPath)}</Descriptions.Item>
              <Descriptions.Item label="OSS Key">{copyableValue(imageData.mediaOssKey)}</Descriptions.Item>
            </Descriptions>
            {imageData.content ? (
              <section>
                <Typography.Title level={5}>文本内容</Typography.Title>
                {rawBlock(imageData.content)}
              </section>
            ) : null}
            {imageData.xmlContent ? (
              <section>
                <Typography.Title level={5}>原始 XML</Typography.Title>
                {rawBlock(imageData.xmlContent)}
              </section>
            ) : null}
          </Space>
        )}
      </Modal>
    </>
  );
}
