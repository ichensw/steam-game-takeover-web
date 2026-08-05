import {
  CheckOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import {
  createWechatAiHistoryLearningTask,
  getWechatAiRoleCard,
  getWechatAiStatus,
  listWechatAiErrors,
  listWechatAiHistoryLearningTasks,
  listWechatAiJobs,
  listWechatAiPromptInstructions,
  listWechatAiReplyLogs,
  resolveWechatAiError,
  retryWechatAiError,
  reviewWechatAiReplyLog,
  updateWechatAiHistoryLearningTask,
  updateWechatAiPromptInstruction,
  updateWechatAiRoleCard,
  type WechatAiPromptInstruction,
  type WechatAiError,
  type WechatAiHistoryLearningTask,
  type WechatAiJob,
  type WechatAiReplyLog,
  type WechatAiStatus,
} from '../api/wechatBot';
import PageHeader from '../components/PageHeader';
import { formatWechatTime } from '../utils/wechatBot';

type IndexFormValues = {
  roomId: string;
  start?: string;
  end?: string;
  maxMessages?: number;
};

const jobLabel: Record<string, string> = {
  reply: '实时回复',
  vector_sync: '增量索引',
  vector_backfill: '历史索引',
};

const statusColor: Record<string, string> = {
  queued: 'gold',
  running: 'processing',
  succeeded: 'success',
  failed: 'error',
  paused: 'default',
  canceled: 'default',
};

const statusLabel: Record<string, string> = {
  queued: '排队中',
  running: '执行中',
  succeeded: '完成',
  failed: '失败',
  paused: '暂停',
  canceled: '已取消',
};

const vectorStatusLabel: Record<string, string> = {
  bot_offline: '机器人离线',
  waiting_for_bot_heartbeat: '等待机器人状态',
  qdrant_url_missing: 'Qdrant 地址未设置',
  qdrant_api_key_missing: 'Qdrant Key 未设置',
  embedding_api_key_missing: 'Embedding Key 未设置',
  vector_unavailable: '向量服务不可用',
};

const indexProgress = (task: WechatAiHistoryLearningTask) => (
  task.totalMsgCount > 0 ? Math.min(100, Math.round(task.processedMsgCount / task.totalMsgCount * 100)) : 0
);

const errorText = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export default function WechatAiMemory() {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingStyle, setSavingStyle] = useState(false);
  const [status, setStatus] = useState<WechatAiStatus>();
  const [groups, setGroups] = useState<Array<{ roomId: string; roomName?: string }>>([]);
  const [tasks, setTasks] = useState<WechatAiHistoryLearningTask[]>([]);
  const [jobs, setJobs] = useState<WechatAiJob[]>([]);
  const [errors, setErrors] = useState<WechatAiError[]>([]);
  const [replyLogs, setReplyLogs] = useState<WechatAiReplyLog[]>([]);
  const [promptInstructions, setPromptInstructions] = useState<WechatAiPromptInstruction[]>([]);
  const [indexForm] = Form.useForm<IndexFormValues>();
  const [styleForm] = Form.useForm<{ roleCard: string; replyInstruction: string }>();
  const [templateForm] = Form.useForm<{ key: string; content: string }>();

  const roomNameByID = useMemo(() => new Map(groups.map((item) => [item.roomId, item.roomName || item.roomId])), [groups]);
  const roomLabel = (roomID: string) => roomNameByID.get(roomID) || roomID;
  const roomOptions = groups.map((item) => ({ value: item.roomId, label: item.roomName || item.roomId }));

  const refresh = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [nextStatus, nextTasks, nextJobs, nextErrors, nextLogs, nextRoleCard, nextInstructions] = await Promise.all([
        getWechatAiStatus(),
        listWechatAiHistoryLearningTasks({ limit: 100 }),
        listWechatAiJobs({ limit: 100 }),
        listWechatAiErrors({ limit: 100 }),
        listWechatAiReplyLogs({ limit: 100 }),
        getWechatAiRoleCard(),
        listWechatAiPromptInstructions(),
      ]);
      setStatus(nextStatus);
      const nextGroups = (nextStatus.rooms || []).map((item) => ({ roomId: item.roomId, roomName: item.roomName }));
      setGroups(nextGroups);
      setTasks(nextTasks.items || []);
      setJobs(nextJobs.items || []);
      setErrors(nextErrors.items || []);
      setReplyLogs(nextLogs.items || []);
      const instructions = nextInstructions.items || [];
      setPromptInstructions(instructions);
      const replyInstruction = (nextInstructions.items || []).find((item) => item.key === 'reply')?.content || '';
      styleForm.setFieldsValue({ roleCard: nextRoleCard.content, replyInstruction });
      const selectedKey = templateForm.getFieldValue('key') || instructions.find((item) => item.key === 'reply_user')?.key || instructions[0]?.key;
      const selected = instructions.find((item) => item.key === selectedKey);
      templateForm.setFieldsValue({ key: selectedKey, content: selected?.content || '' });
      if (!indexForm.getFieldValue('roomId') && nextGroups[0]?.roomId) {
        indexForm.setFieldValue('roomId', nextGroups[0].roomId);
      }
    } catch (error) {
      if (!quiet) message.error(errorText(error, 'AI 页面加载失败'));
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(true), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const createIndexTask = async (values: IndexFormValues) => {
    setSubmitting(true);
    try {
      await createWechatAiHistoryLearningTask(values);
      message.success('历史聊天索引任务已创建');
      await refresh(true);
    } catch (error) {
      message.error(errorText(error, '创建索引任务失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const updateTask = async (task: WechatAiHistoryLearningTask, action: 'pause' | 'resume' | 'cancel' | 'retry') => {
    try {
      await updateWechatAiHistoryLearningTask(task.id, action);
      await refresh(true);
    } catch (error) {
      message.error(errorText(error, '更新任务失败'));
    }
  };

  const resolveError = async (id: number, retry = false) => {
    try {
      if (retry) await retryWechatAiError(id);
      else await resolveWechatAiError(id);
      await refresh(true);
    } catch (error) {
      message.error(errorText(error, retry ? '重试错误任务失败' : '标记错误已处理失败'));
    }
  };

  const reviewReply = async (id: number, feedback: 'human' | 'too_ai' | 'too_much') => {
    try {
      await reviewWechatAiReplyLog(id, feedback);
      await refresh(true);
    } catch (error) {
      message.error(errorText(error, '回复反馈保存失败'));
    }
  };

  const saveStyle = async (values: { roleCard: string; replyInstruction: string }) => {
    setSavingStyle(true);
    try {
      await Promise.all([
        updateWechatAiRoleCard(values.roleCard || ''),
        updateWechatAiPromptInstruction('reply', values.replyInstruction || ''),
      ]);
      message.success('回复风格已保存');
    } catch (error) {
      message.error(errorText(error, '保存回复风格失败'));
    } finally {
      setSavingStyle(false);
    }
  };

  const selectTemplate = (key: string) => {
    const selected = promptInstructions.find((item) => item.key === key);
    templateForm.setFieldsValue({ key, content: selected?.content || '' });
  };

  const saveTemplate = async (values: { key: string; content: string }) => {
    if (!values.key) return;
    setSavingStyle(true);
    try {
      await updateWechatAiPromptInstruction(values.key, values.content || '');
      message.success('提示词模板已保存');
      await refresh(true);
    } catch (error) {
      message.error(errorText(error, '保存提示词模板失败'));
    } finally {
      setSavingStyle(false);
    }
  };

  const taskColumns: ColumnsType<WechatAiHistoryLearningTask> = [
    { title: '群聊', dataIndex: 'roomId', width: 210, render: roomLabel },
    { title: '状态', dataIndex: 'status', width: 95, render: (value: string) => <Tag color={statusColor[value]}>{statusLabel[value] || value}</Tag> },
    {
      title: '进度',
      width: 180,
      render: (_, item) => <Progress percent={indexProgress(item)} size="small" status={item.status === 'failed' ? 'exception' : item.status === 'succeeded' ? 'success' : 'active'} />,
    },
    { title: '文本', width: 100, render: (_, item) => `${item.processedMsgCount}/${item.totalMsgCount}` },
    { title: '错误', dataIndex: 'errorMessage', ellipsis: true, render: (value?: string) => value || '-' },
    {
      title: '操作',
      width: 130,
      render: (_, item) => <Space size={2}>
        {(item.status === 'queued' || item.status === 'running') && <Button type="text" size="small" icon={<PauseCircleOutlined />} onClick={() => void updateTask(item, 'pause')} />}
        {item.status === 'paused' && <Button type="text" size="small" icon={<PlayCircleOutlined />} onClick={() => void updateTask(item, 'resume')} />}
        {item.status === 'failed' && <Button type="text" size="small" icon={<ReloadOutlined />} onClick={() => void updateTask(item, 'retry')} />}
        {!['succeeded', 'canceled'].includes(item.status) && <Button type="text" danger size="small" icon={<StopOutlined />} onClick={() => void updateTask(item, 'cancel')} />}
      </Space>,
    },
  ];

  const jobColumns: ColumnsType<WechatAiJob> = [
    { title: '类型', dataIndex: 'jobType', width: 180, render: (value: string) => jobLabel[value] || value },
    { title: '群聊', dataIndex: 'roomId', width: 200, render: roomLabel },
    { title: '状态', dataIndex: 'status', width: 95, render: (value: string) => <Tag color={statusColor[value]}>{statusLabel[value] || value}</Tag> },
    { title: '处理文本', dataIndex: 'inputMsgCount', width: 95, render: (value: number) => value || '-' },
    { title: '完成时间', dataIndex: 'finishedAt', width: 170, render: (value) => formatWechatTime(value) || '-' },
  ];

  const errorColumns: ColumnsType<WechatAiError> = [
    { title: '类型', dataIndex: 'jobType', width: 180, render: (value: string) => jobLabel[value] || value },
    { title: '错误', dataIndex: 'errorMessage', ellipsis: true },
    { title: '时间', dataIndex: 'createdAt', width: 170, render: (value) => formatWechatTime(value) || '-' },
    {
      title: '操作', width: 130, render: (_, item) => <Space size={2}>
        {!item.resolved && <Button type="text" size="small" icon={<ReloadOutlined />} onClick={() => void resolveError(item.id, true)} />}
        {!item.resolved && <Button type="text" size="small" icon={<CheckOutlined />} onClick={() => void resolveError(item.id)} />}
      </Space>,
    },
  ];

  const replyColumns: ColumnsType<WechatAiReplyLog> = [
    { title: '群聊', dataIndex: 'roomId', width: 180, render: roomLabel },
    { title: '提问', dataIndex: 'triggerContent', ellipsis: true },
    { title: '回复', dataIndex: 'replyText', ellipsis: true },
    { title: '时间', dataIndex: 'createdAt', width: 170, render: (value) => formatWechatTime(value) || '-' },
    {
      title: '反馈', width: 175, render: (_, item) => <Space size={2}>
        <Button size="small" type={item.feedback === 'human' ? 'primary' : 'default'} onClick={() => void reviewReply(item.id, 'human')}>像人</Button>
        <Button size="small" danger={item.feedback === 'too_ai'} onClick={() => void reviewReply(item.id, 'too_ai')}>太 AI</Button>
        <Button size="small" danger={item.feedback === 'too_much'} onClick={() => void reviewReply(item.id, 'too_much')}>过火</Button>
      </Space>,
    },
  ];

  const vector = status?.vector;
  const vectorSyncStates = vector?.syncStates ?? [];
  const vectorStatus = vector?.configured ? '可用' : vectorStatusLabel[vector?.reason || ''] || '待配置';
  return <div>
    <PageHeader title="AI 聊天检索" description="只索引原始文本消息；不生成成员画像、关系判断或群结论。" />
    <Alert type="info" showIcon message="历史聊天只作为可追溯原文" description="机器人会用检索到的消息回答“谁之前说过什么”。接龙活动仍以接龙数据库实时状态为准。" style={{ marginBottom: 16 }} />
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={14}>
        <Card title="向量索引" loading={loading} extra={<Button icon={<ReloadOutlined />} onClick={() => void refresh()}>刷新</Button>}>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}><Typography.Text type="secondary">状态</Typography.Text><div><Tag color={vector?.configured ? 'success' : 'warning'}>{vectorStatus}</Tag></div></Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">Embedding</Typography.Text><div>{vector?.embeddingModel || '-'}</div></Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">已同步群聊</Typography.Text><div>{vectorSyncStates.length}</div></Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">同步错误</Typography.Text><div>{vectorSyncStates.filter((item) => item.lastError).length}</div></Col>
          </Row>
          <Table rowKey="roomId" size="small" style={{ marginTop: 16 }} pagination={false} dataSource={vectorSyncStates} columns={[
            { title: '群聊', dataIndex: 'roomId', render: roomLabel },
            { title: '最后同步', dataIndex: 'lastSuccessAt', render: (value) => formatWechatTime(value) || '-' },
            { title: '错误', dataIndex: 'lastError', render: (value) => value || '-' },
          ]} />
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Card title="历史聊天索引">
          <Form form={indexForm} layout="vertical" onFinish={(values) => void createIndexTask(values)}>
            <Form.Item name="roomId" label="群聊" rules={[{ required: true, message: '请选择群聊' }]}><Select showSearch optionFilterProp="label" options={roomOptions} /></Form.Item>
            <Row gutter={12}>
              <Col span={12}><Form.Item name="start" label="开始时间"><Input type="datetime-local" /></Form.Item></Col>
              <Col span={12}><Form.Item name="end" label="结束时间"><Input type="datetime-local" /></Form.Item></Col>
            </Row>
            <Form.Item name="maxMessages" label="最多文本消息"><InputNumber min={1} style={{ width: '100%' }} placeholder="不限制" /></Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={!vector?.configured}>开始索引</Button>
          </Form>
        </Card>
      </Col>
      <Col span={24}><Card title="索引任务" loading={loading}><Table rowKey="id" size="small" columns={taskColumns} dataSource={tasks} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 900 }} /></Card></Col>
      <Col xs={24} xl={12}><Card title="最近任务"><Table rowKey="id" size="small" columns={jobColumns} dataSource={jobs} pagination={{ pageSize: 8, showSizeChanger: false }} scroll={{ x: 780 }} /></Card></Col>
      <Col xs={24} xl={12}><Card title="失败记录"><Table rowKey="id" size="small" columns={errorColumns} dataSource={errors} pagination={{ pageSize: 8, showSizeChanger: false }} scroll={{ x: 700 }} /></Card></Col>
      <Col span={24}>
        <Card title="回复风格">
          <Form form={styleForm} layout="vertical" onFinish={(values) => void saveStyle(values)}>
            <Form.Item name="roleCard" label="角色卡"><Input.TextArea rows={4} maxLength={8000} /></Form.Item>
            <Form.Item name="replyInstruction" label="回答规则"><Input.TextArea rows={3} maxLength={4000} /></Form.Item>
            <Button type="primary" htmlType="submit" loading={savingStyle}>保存</Button>
          </Form>
        </Card>
      </Col>
      <Col span={24}>
        <Card title="提示词模板">
          <Form form={templateForm} layout="vertical" onFinish={(values) => void saveTemplate(values)}>
            <Form.Item name="key" label="模板"><Select options={promptInstructions.map((item) => ({ value: item.key, label: item.label || item.key }))} onChange={selectTemplate} /></Form.Item>
            <Form.Item shouldUpdate noStyle>{() => {
              const selected = promptInstructions.find((item) => item.key === templateForm.getFieldValue('key'));
              return selected?.placeholders?.length ? <Typography.Text type="secondary">可用占位符：{selected.placeholders.map((item) => `{{${item}}}`).join('、')}</Typography.Text> : null;
            }}</Form.Item>
            <Form.Item name="content" label="内容" rules={[{ required: true, message: '提示词不能为空' }]}><Input.TextArea rows={14} maxLength={16000} /></Form.Item>
            <Button type="primary" htmlType="submit" loading={savingStyle}>保存模板</Button>
          </Form>
        </Card>
      </Col>
      <Col span={24}><Card title="回复反馈"><Table rowKey="id" size="small" columns={replyColumns} dataSource={replyLogs} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 1000 }} /></Card></Col>
    </Row>
  </div>;
}
