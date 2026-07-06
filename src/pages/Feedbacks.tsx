import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Image,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  App as AntApp,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { getFeedback, listFeedbacks, updateFeedbackStatus } from '../api/admin';
import PageHeader from '../components/PageHeader';
import StatusTag from '../components/StatusTag';

type DateLike = { format: (template: string) => string };
type FeedbackRow = Record<string, unknown> & {
  id: React.Key;
  user_id?: number;
  nickname?: string;
  avatar_url?: string;
  steam_id?: string;
  feedback_type?: string;
  content?: string;
  contact?: string;
  images?: string[];
  status?: number;
  status_label?: string;
  statusLabel?: string;
  created_at?: string;
  updated_at?: string;
};

const typeLabels: Record<string, string> = {
  suggestion: '建议',
  problem: '问题',
  experience: '体验',
  other: '其他',
};

const statusOptions = [
  { value: 1, label: '待采纳' },
  { value: 2, label: '已采纳' },
  { value: 3, label: '不理睬' },
];

const statusByLabel: Record<string, number> = {
  待采纳: 1,
  已采纳: 2,
  不理睬: 3,
};

export default function Feedbacks() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<FeedbackRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();

  const buildParams = (targetPage: number) => {
    const values = form.getFieldsValue();
    const range = values.createdRange as DateLike[] | undefined;
    const params: Record<string, string | number | undefined> = {
      page: targetPage,
      page_size: 20,
      keyword: values.keyword,
      status: values.status,
      feedback_type: values.feedback_type,
    };
    if (range?.length === 2) {
      params.start_time = range[0].format('YYYY-MM-DD 00:00:00');
      params.end_time = range[1].format('YYYY-MM-DD 23:59:59');
    }
    return params;
  };

  const load = async (targetPage = page) => {
    setLoading(true);
    try {
      const res = await listFeedbacks(buildParams(targetPage));
      setRows((res.items || res.list || []) as FeedbackRow[]);
      setTotal(res.total || 0);
      setPage(targetPage);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (id: React.Key) => {
    setDetailLoading(true);
    setDetail({ id });
    try {
      setDetail((await getFeedback(id)) as FeedbackRow);
    } finally {
      setDetailLoading(false);
    }
  };

  const changeStatus = async (id: React.Key, status: number, closeDetail = false) => {
    await updateFeedbackStatus(id, status);
    message.success('反馈状态已更新');
    if (closeDetail) setDetail(null);
    load();
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    form.resetFields();
    setTimeout(() => load(1), 0);
  };

  const renderType = (value?: string) => (
    <Tag color={value === 'problem' ? 'red' : value === 'suggestion' ? 'blue' : 'default'}>
      {typeLabels[value || ''] || value || '-'}
    </Tag>
  );

  const getFeedbackStatus = (row: FeedbackRow) => {
    const numericStatus = Number(row.status);
    if ([1, 2, 3].includes(numericStatus)) return numericStatus;
    return statusByLabel[row.status_label || row.statusLabel || ''];
  };

  const renderFeedbackStatus = (_: unknown, row: FeedbackRow) => (
    <StatusTag value={getFeedbackStatus(row) || row.status_label || row.statusLabel} />
  );

  const renderImages = (images?: string[]) => {
    if (!images?.length) return '-';
    return (
      <Image.PreviewGroup>
        <div className="feedback-image-strip">
          {images.map((url, index) => (
            <Image
              key={url}
              src={url}
              width={44}
              height={44}
              alt={`反馈图片 ${index + 1}`}
            />
          ))}
        </div>
      </Image.PreviewGroup>
    );
  };

  const columns: ColumnsType<FeedbackRow> = [
    { title: 'ID', dataIndex: 'id', width: 84, className: 'mono' },
    { title: '用户', dataIndex: 'nickname', width: 140 },
    { title: '类型', dataIndex: 'feedback_type', width: 120, render: renderType },
    { title: '内容', dataIndex: 'content', ellipsis: true },
    {
      title: '图片',
      dataIndex: 'images',
      width: 190,
      render: renderImages,
    },
    { title: '状态', dataIndex: 'status', width: 110, render: renderFeedbackStatus },
    { title: '提交时间', dataIndex: 'created_at', width: 180, className: 'mono' },
    {
      title: '操作',
      width: 230,
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => openDetail(row.id)}>
            详情
          </Button>
          <Popconfirm
            title="更新反馈状态"
            description="确认标记为已采纳？"
            okText="采纳"
            cancelText="取消"
            onConfirm={() => changeStatus(row.id, 2)}
          >
            <Button size="small" disabled={getFeedbackStatus(row) === 2}>
              采纳
            </Button>
          </Popconfirm>
          <Popconfirm
            title="更新反馈状态"
            description="确认标记为不理睬？"
            okText="不理睬"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => changeStatus(row.id, 3)}
          >
            <Button size="small" danger disabled={getFeedbackStatus(row) === 3}>
              不理睬
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="反馈管理" description="查看用户意见反馈，并更新采纳状态。" />
      <Card className="filter-card">
        <Form form={form} layout="inline" onFinish={() => load(1)}>
          <Form.Item name="keyword">
            <Input.Search placeholder="内容 / 联系方式 / 昵称" allowClear />
          </Form.Item>
          <Form.Item name="feedback_type">
            <Select
              placeholder="类型"
              allowClear
              style={{ width: 130 }}
              options={[
                { value: 'suggestion', label: '建议' },
                { value: 'problem', label: '问题' },
                { value: 'experience', label: '体验' },
                { value: 'other', label: '其他' },
              ]}
            />
          </Form.Item>
          <Form.Item name="status">
            <Select
              placeholder="状态"
              allowClear
              style={{ width: 140 }}
              options={statusOptions}
            />
          </Form.Item>
          <Form.Item name="createdRange">
            <DatePicker.RangePicker />
          </Form.Item>
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
        scroll={{ x: 1080 }}
        pagination={{
          total,
          current: page,
          pageSize: 20,
          onChange: load,
          showTotal: (n) => `共 ${n} 条`,
        }}
      />
      <Drawer
        title="反馈详情"
        width={700}
        open={!!detail}
        onClose={() => setDetail(null)}
        loading={detailLoading}
        extra={
          detail?.id ? (
            <Space>
              <Popconfirm
                title="更新反馈状态"
                description="确认标记为已采纳？"
                okText="采纳"
                cancelText="取消"
                onConfirm={() => changeStatus(detail.id, 2, true)}
              >
                <Button disabled={getFeedbackStatus(detail) === 2}>采纳</Button>
              </Popconfirm>
              <Popconfirm
                title="更新反馈状态"
                description="确认标记为不理睬？"
                okText="不理睬"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={() => changeStatus(detail.id, 3, true)}
              >
                <Button danger disabled={getFeedbackStatus(detail) === 3}>
                  不理睬
                </Button>
              </Popconfirm>
            </Space>
          ) : null
        }
      >
        {detail && (
          <Space direction="vertical" size={18} className="detail-stack">
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="反馈ID">
                <span className="mono">{detail.id}</span>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {renderFeedbackStatus(null, detail)}
              </Descriptions.Item>
              <Descriptions.Item label="用户">{detail.nickname || '-'}</Descriptions.Item>
              <Descriptions.Item label="用户ID">
                <span className="mono">{detail.user_id || '-'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="SteamID">
                <span className="mono">{detail.steam_id || '-'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="类型">
                {renderType(detail.feedback_type)}
              </Descriptions.Item>
              <Descriptions.Item label="联系方式" span={2}>
                {detail.contact || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="提交时间">
                <span className="mono">{detail.created_at || '-'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                <span className="mono">{detail.updated_at || '-'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="内容" span={2}>
                <Typography.Paragraph className="feedback-content">
                  {detail.content || '-'}
                </Typography.Paragraph>
              </Descriptions.Item>
            </Descriptions>
            <section>
              <Typography.Title level={5}>反馈图片</Typography.Title>
              {detail.images?.length ? (
                <Image.PreviewGroup>
                  <div className="feedback-images">
                    {detail.images.map((url) => (
                      <Image key={url} src={url} width={128} height={96} />
                    ))}
                  </div>
                </Image.PreviewGroup>
              ) : (
                <Typography.Text type="secondary">未上传图片</Typography.Text>
              )}
            </section>
          </Space>
        )}
      </Drawer>
    </>
  );
}
