import { CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, HistoryOutlined, MessageOutlined, SyncOutlined } from '@ant-design/icons';
import { Alert, App as AntApp, Button, Card, Col, Drawer, Empty, Form, Input, List, Progress, Row, Select, Space, Spin, Statistic, Steps, Tag, Typography } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createWechatSummaryJob,
  getWechatSummaryJob,
  getWechatSummary,
  listWechatGroups,
  listWechatSummaryHistory,
  listWechatSummaryMessages,
  type WechatGroup,
  type WechatMessage,
  type WechatSummary as WechatSummaryData,
  type WechatSummaryJob,
  type WechatSummaryReport,
  type WechatSummaryTopic,
} from '../api/wechatBot';
import PageHeader from '../components/PageHeader';
import { formatWechatTime, summaryPayload, toApiTime, todayString, type SummaryFormValues } from '../utils/wechatBot';

const periodOptions = [
  { value: 'day', label: '全天' },
  { value: 'morning', label: '上午（00:00-12:00）' },
  { value: 'afternoon', label: '下午（12:00-18:00）' },
  { value: 'evening', label: '晚上（18:00-24:00）' },
  { value: 'custom', label: '自定义时间段' },
];

const emptyReport: WechatSummaryReport = {
  overview: '',
  topics: [],
  importantInfo: [],
  memes: [],
  disputes: '整体无明显争议',
  miniPrograms: [],
};

type HistorySearchValues = {
  roomId?: string;
  start?: string;
  end?: string;
};

const jobStatusText: Record<WechatSummaryJob['status'], string> = {
  pending: '等待中',
  running: '执行中',
  succeeded: '已完成',
  failed: '失败',
};

function isActiveJob(job: WechatSummaryJob | null) {
  return job?.status === 'pending' || job?.status === 'running';
}

function jobStep(job: WechatSummaryJob) {
  if (job.status === 'succeeded') return 3;
  if (job.chunkCount > 0 || (job.processedChunkCount || 0) > 0) return 2;
  if (job.messageCount > 0 || job.startedAt) return 1;
  return 0;
}

function jobProgress(job: WechatSummaryJob) {
  if (job.status === 'succeeded') return 100;
  if (job.status === 'failed') return 100;
  if (job.chunkCount > 0) {
    const processed = Math.min(job.processedChunkCount || 0, job.chunkCount);
    return Math.max(52, Math.min(94, Math.round(52 + (processed / job.chunkCount) * 42)));
  }
  if (job.messageCount > 0) return 46;
  if (job.startedAt) return 28;
  return 16;
}

function jobProgressStatus(job: WechatSummaryJob): 'active' | 'exception' | 'success' {
  if (job.status === 'failed') return 'exception';
  if (job.status === 'succeeded') return 'success';
  return 'active';
}

function jobTag(job: WechatSummaryJob) {
  if (job.status === 'failed') return <Tag color="red">{jobStatusText[job.status]}</Tag>;
  if (job.status === 'succeeded') return <Tag color="green">{jobStatusText[job.status]}</Tag>;
  return <Tag color="processing" icon={<SyncOutlined spin />}>{jobStatusText[job.status]}</Tag>;
}

function processedChunkText(job: WechatSummaryJob) {
  if (!job.chunkCount) return '0/0 段';
  return `${Math.min(job.processedChunkCount || 0, job.chunkCount)}/${job.chunkCount} 段`;
}

function reportOf(result: WechatSummaryData | null): WechatSummaryReport {
  if (!result) return emptyReport;
  return {
    ...emptyReport,
    ...result.report,
    overview: result.report?.overview || result.summary || '',
    topics: result.report?.topics || [],
    importantInfo: result.report?.importantInfo || [],
    memes: result.report?.memes || [],
    miniPrograms: result.report?.miniPrograms || [],
  };
}

function shortRange(result: WechatSummaryData) {
  if (!result.start && !result.end) return '未标记时间';
  return `${result.start ? formatWechatTime(result.start) : '-'} 至 ${result.end ? formatWechatTime(result.end) : '-'}`;
}

function topicTime(topic: WechatSummaryTopic) {
  if (!topic.start && !topic.end) return '';
  return `${topic.start || '-'} - ${topic.end || '-'}`;
}

export default function WechatSummary() {
  const [groups, setGroups] = useState<WechatGroup[]>([]);
  const [history, setHistory] = useState<WechatSummaryData[]>([]);
  const [result, setResult] = useState<WechatSummaryData | null>(null);
  const [originalMessages, setOriginalMessages] = useState<WechatMessage[]>([]);
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalOpen, setOriginalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [job, setJob] = useState<WechatSummaryJob | null>(null);
  const [lastSummaryId, setLastSummaryId] = useState<number | null>(null);
  const [form] = Form.useForm<SummaryFormValues>();
  const [historyForm] = Form.useForm<HistorySearchValues>();
  const period = Form.useWatch('period', form);
  const activeJobId = useRef(0);
  const { message } = AntApp.useApp();
  const report = useMemo(() => reportOf(result), [result]);
  const runningJob = isActiveJob(job);
  const currentSummaryId = job?.summary?.id || job?.summaryId;

  const loadHistory = async (values: HistorySearchValues = historyForm.getFieldsValue()) => {
    setHistoryLoading(true);
    try {
      const data = await listWechatSummaryHistory({
        roomId: values.roomId,
        start: toApiTime(values.start) || undefined,
        end: toApiTime(values.end) || undefined,
        page: 1,
        pageSize: 20,
      });
      setHistory(data.data || []);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '历史总结加载失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    listWechatGroups().then(setGroups).catch((error) => {
      message.error(error instanceof Error ? error.message : '群聊列表加载失败');
    });
    void loadHistory({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pollSummaryJob = async (jobId: number, roomId?: string) => {
    try {
      let current = await getWechatSummaryJob(jobId);
      setJob(current);
      for (let index = 0; index < 240 && current.status !== 'succeeded' && current.status !== 'failed'; index += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        if (activeJobId.current !== jobId) return;
        current = await getWechatSummaryJob(jobId);
        setJob(current);
      }
      if (activeJobId.current !== jobId) return;
      if (current.status === 'failed') {
        message.error(current.error || '总结生成失败');
        return;
      }
      if (current.status !== 'succeeded') {
        message.info('总结任务仍在执行，可稍后刷新历史查看结果');
        return;
      }
      setLastSummaryId(current.summary?.id || current.summaryId || null);
      await loadHistory({ roomId });
      message.success('总结已生成，可在历史列表查看');
    } catch (error) {
      if (activeJobId.current === jobId) {
        message.error(error instanceof Error ? error.message : '总结任务状态查询失败');
      }
    }
  };

  const submit = async (values: SummaryFormValues) => {
    setLoading(true);
    setJob(null);
    try {
      const created = await createWechatSummaryJob(summaryPayload(values));
      activeJobId.current = created.id;
      setJob(created);
      message.success('总结任务已创建，正在跟踪进度');
      void pollSummaryJob(created.id, values.roomId);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '总结生成失败');
    } finally {
      setLoading(false);
    }
  };

  const openHistory = async (id?: number) => {
    if (!id) return;
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      setResult(await getWechatSummary(id));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '历史总结打开失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const openOriginalMessages = async (topic: WechatSummaryTopic, topicIndex: number) => {
    if (!result?.id) return;
    try {
      const data = await listWechatSummaryMessages(result.id, { topicIndex });
      setOriginalMessages(data.data || []);
      setOriginalTitle(topic.title);
      setOriginalOpen(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '原文加载失败');
    }
  };

  return (
    <>
      <PageHeader
        title="微信 AI 总结"
        description="把群聊噪音整理成可追溯的话题日报、重要信息和热点梗。"
      />
      <Row gutter={[16, 16]} className="wechat-summary-console">
        <Col xs={24} xl={10}>
          <Card title="生成总结" className="wechat-summary-panel">
            <Form form={form} layout="vertical" initialValues={{ date: todayString(), period: 'day' }} onFinish={submit}>
              <Row gutter={12}>
                <Col xs={24} md={12} xl={24}>
                  <Form.Item label="群聊" name="roomId">
                    <Select allowClear showSearch optionFilterProp="label" placeholder="全部群聊" options={groups.map((group) => ({ value: group.roomId, label: group.roomName || group.roomId }))} />
                  </Form.Item>
                </Col>
                {period !== 'custom' ? (
                  <Col xs={24} sm={12}>
                    <Form.Item label="日期" name="date"><Input type="date" aria-label="总结日期" /></Form.Item>
                  </Col>
                ) : null}
                <Col xs={24} sm={period !== 'custom' ? 12 : 24}>
                  <Form.Item label="时间范围" name="period"><Select options={periodOptions} /></Form.Item>
                </Col>
                {period === 'custom' ? (
                  <>
                    <Col xs={24} sm={12}>
                      <Form.Item label="开始时间" name="start" rules={[{ required: true, message: '请选择开始时间' }]}><Input type="datetime-local" aria-label="开始时间" /></Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="结束时间" name="end" rules={[{ required: true, message: '请选择结束时间' }]}><Input type="datetime-local" aria-label="结束时间" /></Form.Item>
                    </Col>
                  </>
                ) : null}
              </Row>
              <Button type="primary" htmlType="submit" icon={<FileTextOutlined />} loading={loading || runningJob} disabled={runningJob} block>
                {runningJob ? '任务执行中' : '生成总结'}
              </Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card
            title="当前任务"
            className="wechat-summary-panel wechat-summary-job"
            extra={job ? jobTag(job) : <Tag>未开始</Tag>}
          >
            {job ? (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Space wrap className="wechat-summary-job-meta">
                  <Typography.Text className="mono">任务 #{job.id}</Typography.Text>
                  <Typography.Text type="secondary">{job.roomName || job.roomId || '全部群聊'}</Typography.Text>
                  <Typography.Text type="secondary">{job.start ? formatWechatTime(job.start) : '-'} 至 {job.end ? formatWechatTime(job.end) : '-'}</Typography.Text>
                </Space>
                <Progress
                  percent={jobProgress(job)}
                  status={jobProgressStatus(job)}
                  strokeLinecap="butt"
                  format={() => jobStatusText[job.status]}
                />
                <Steps
                  size="small"
                  current={jobStep(job)}
                  status={job.status === 'failed' ? 'error' : job.status === 'succeeded' ? 'finish' : 'process'}
                  items={[
                    { title: '创建任务' },
                    { title: '读取消息', description: `${job.messageCount || 0} 条` },
                    { title: 'AI 生成', description: processedChunkText(job) },
                    { title: '写入历史' },
                  ]}
                />
                <Row gutter={[12, 12]}>
                  <Col xs={12} md={6}><Statistic title="消息" value={job.messageCount || 0} /></Col>
                  <Col xs={12} md={6}><Statistic title="分段" value={job.chunkCount || 0} /></Col>
                  <Col xs={12} md={6}><Statistic title="AI 生成" value={processedChunkText(job)} /></Col>
                  <Col xs={12} md={6}><Statistic title="完成" value={job.finishedAt ? formatWechatTime(job.finishedAt).slice(11, 19) : '-'} /></Col>
                </Row>
                {job.error ? <Alert type="error" showIcon message={job.error} /> : null}
                {job.sendStatus || job.sendError ? <Alert type={job.sendError ? 'warning' : 'success'} showIcon message={`发群：${job.sendStatus || '未发送'}${job.sendError ? `，${job.sendError}` : ''}`} /> : null}
                {currentSummaryId ? (
                  <Button icon={<CheckCircleOutlined />} onClick={() => openHistory(currentSummaryId)}>
                    查看本次总结
                  </Button>
                ) : null}
              </Space>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无执行中的总结任务" />
            )}
          </Card>
        </Col>
      </Row>
      <Card
        title="历史总结"
        className="wechat-summary-history"
        extra={<Button icon={<HistoryOutlined />} loading={historyLoading} onClick={() => loadHistory()}>刷新</Button>}
      >
        <Form form={historyForm} layout="inline" onFinish={loadHistory} className="wechat-summary-history-filter">
          <Form.Item name="roomId">
            <Select allowClear showSearch optionFilterProp="label" placeholder="全部群聊" style={{ width: 220 }} options={groups.map((group) => ({ value: group.roomId, label: group.roomName || group.roomId }))} />
          </Form.Item>
          <Form.Item name="start"><Input type="datetime-local" aria-label="历史开始时间" /></Form.Item>
          <Form.Item name="end"><Input type="datetime-local" aria-label="历史结束时间" /></Form.Item>
          <Button htmlType="submit" icon={<HistoryOutlined />} loading={historyLoading}>查询</Button>
        </Form>
        <List
          loading={historyLoading}
          dataSource={history}
          locale={{ emptyText: '暂无历史总结' }}
          renderItem={(item, index) => (
            <List.Item className={`wechat-summary-history-item${item.id === lastSummaryId ? ' is-latest' : ''}`} onClick={() => openHistory(item.id)}>
              <List.Item.Meta
                title={(
                  <Space wrap className="wechat-summary-history-title">
                    <Typography.Text>{item.report?.overview || item.summary || '未命名总结'}</Typography.Text>
                    {item.id === lastSummaryId ? <Tag color="green">刚生成</Tag> : null}
                    {item.id !== lastSummaryId && index === 0 ? <Tag color="blue">最新</Tag> : null}
                  </Space>
                )}
                description={(
                  <Space wrap size={12}>
                    <Typography.Text type="secondary">{item.roomName || item.roomId || '全部群聊'}</Typography.Text>
                    <Typography.Text type="secondary"><ClockCircleOutlined /> {item.start ? formatWechatTime(item.start) : '-'}</Typography.Text>
                    <Typography.Text type="secondary">{item.messageCount || 0} 条消息</Typography.Text>
                    <Typography.Text type="secondary">{item.report?.topics?.length || 0} 个话题</Typography.Text>
                  </Space>
                )}
              />
              <Button type="text" onClick={(event) => { event.stopPropagation(); void openHistory(item.id); }}>查看</Button>
            </List.Item>
          )}
        />
      </Card>

      <Drawer title="总结详情" open={detailOpen} onClose={() => setDetailOpen(false)} width={920}>
        <Spin spinning={detailLoading}>
          {result ? (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {result.truncated ? <Alert type="warning" showIcon message={`消息数量较多，本次总结已达到当前配置上限（${result.maxMessages || 1000} 条）。`} /> : null}
              {report.parseFailed ? <Alert type="warning" showIcon message="AI 返回的结构不完整，已按纯文本摘要兜底展示。" /> : null}
              <Card className="wechat-summary-hero">
                <Typography.Text type="secondary">{result.roomName || result.roomId || '全部群聊'} · {shortRange(result)}</Typography.Text>
                <Typography.Title level={3}>{report.overview}</Typography.Title>
                <Row gutter={[12, 12]}>
                  <Col xs={12} md={6}><Statistic title="消息" value={result.messageCount || 0} /></Col>
                  <Col xs={12} md={6}><Statistic title="发言人" value={result.speakerCount || 0} /></Col>
                  <Col xs={12} md={6}><Statistic title="话题" value={report.topics.length} /></Col>
                  <Col xs={12} md={6}><Statistic title="模型" value={result.model || '-'} /></Col>
                </Row>
              </Card>

              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {report.topics.length ? report.topics.map((topic, index) => (
                  <Card key={`${topic.title}-${index}`} className="wechat-topic-card">
                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                      <Space wrap align="start" style={{ justifyContent: 'space-between', width: '100%' }}>
                        <div>
                          <Typography.Title level={4}>{topic.title}</Typography.Title>
                          <Typography.Text type="secondary">{topicTime(topic)}</Typography.Text>
                        </div>
                        <Space wrap>
                          <Tag color="gold">{topic.messageCount || 0} 条</Tag>
                          <Tag color="cyan">{topic.speakerCount || 0} 人</Tag>
                        </Space>
                      </Space>
                      <Typography.Paragraph>{topic.summary || '无摘要'}</Typography.Paragraph>
                      {topic.keywords?.length ? <Space wrap>{topic.keywords.map((keyword) => <Tag key={keyword}>{keyword}</Tag>)}</Space> : null}
                      {topic.samples?.length ? (
                        <div className="wechat-topic-samples">
                          {topic.samples.slice(0, 3).map((sample, sampleIndex) => (
                            <Typography.Text key={`${sample.id || sampleIndex}`} type="secondary">
                              {sample.time ? formatWechatTime(sample.time) : ''} {sample.sender || '未知'}：{sample.content || ''}
                            </Typography.Text>
                          ))}
                        </div>
                      ) : null}
                      <Button size="small" icon={<MessageOutlined />} disabled={!result.id || !topic.messageIds?.length} onClick={() => openOriginalMessages(topic, index)}>查看原文</Button>
                    </Space>
                  </Card>
                )) : <Empty description="没有识别到明确话题" />}
              </Space>

              <Row gutter={[16, 16]}>
                <SummaryBucket title="值得注意的信息" items={report.importantInfo} />
                <SummaryBucket title="群内热点 / 梗 / 吐槽" items={report.memes} />
                <SummaryBucket title="争议或情绪" items={[report.disputes]} />
                <SummaryBucket title="小程序 / 接龙" items={report.miniPrograms} />
              </Row>
              {report.modelComparisons?.length ? (
                <Card title="模型对比" className="wechat-summary-bucket">
                  <List
                    dataSource={report.modelComparisons}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta title={item.model} description={item.overview} />
                      </List.Item>
                    )}
                  />
                </Card>
              ) : null}
            </Space>
          ) : <Empty description="请选择一条历史总结" />}
        </Spin>
      </Drawer>

      <Drawer title={`相关原文：${originalTitle}`} open={originalOpen} onClose={() => setOriginalOpen(false)} width={720}>
        <List
          dataSource={originalMessages}
          locale={{ emptyText: '没有可追溯的原文' }}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={<Space wrap><Typography.Text>{item.senderName || item.senderWxid || '未知发送人'}</Typography.Text><Typography.Text type="secondary">{formatWechatTime(item.createdAt)}</Typography.Text></Space>}
                description={<Typography.Paragraph className="wechat-original-message">{item.content || item.xmlContent || ''}</Typography.Paragraph>}
              />
            </List.Item>
          )}
        />
      </Drawer>
    </>
  );
}

function SummaryBucket({ title, items }: { title: string; items: string[] }) {
  const values = items?.filter(Boolean).length ? items.filter(Boolean) : ['无明显重要信息'];
  return (
    <Col xs={24} md={12}>
      <Card title={title} className="wechat-summary-bucket">
        <List size="small" dataSource={values} renderItem={(item) => <List.Item>{item}</List.Item>} />
      </Card>
    </Col>
  );
}
