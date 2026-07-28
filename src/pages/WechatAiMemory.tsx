import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  FileSearchOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RedoOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import {
  createWechatAiHistoryLearningTask,
  createWechatAiJob,
  getWechatAiRoomPersona,
  getWechatAiPersonaCandidateEvidence,
  getWechatAiStatus,
  listWechatGroups,
  listWechatAiHistoryLearningTasks,
  listWechatAiErrors,
  listWechatAiJobs,
  listWechatAiMemoryRuns,
  listWechatAiPersonaCandidates,
  listWechatAiProfiles,
  promoteWechatAiPersonaCandidate,
  rejectWechatAiPersonaCandidate,
  resolveWechatAiError,
  retryWechatAiError,
  updateWechatAiHistoryLearningTask,
  type WechatAiError,
  type WechatAiHistoryLearningTask,
  type WechatAiJob,
  type WechatAiMemoryRun,
  type WechatAiPersona,
  type WechatAiPersonaCandidate,
  type WechatAiPersonaEvidence,
  type WechatAiProfile,
  type WechatAiStatus,
  type WechatGroup,
  type WechatMessage,
} from '../api/wechatBot';
import PageHeader from '../components/PageHeader';
import { formatWechatTime } from '../utils/wechatBot';

type ManualJobType = 'segment_summary' | 'profile_merge' | 'culture_update' | 'persona_candidate';
type ManualFormValues = {
  roomId: string;
  jobType: ManualJobType;
  start?: string;
  end?: string;
  model?: string;
  reason?: string;
};
type LearningFormValues = {
  roomId: string;
  start?: string;
  end?: string;
  maxMessages?: number;
};

const jobTypeLabel: Record<WechatAiJob['jobType'], string> = {
  reply: '实时回复',
  segment_summary: '分段总结',
  profile_merge: '画像合并',
  culture_update: '群文化更新',
  persona_candidate: '人格候选',
};

const jobStatusColor: Record<WechatAiJob['status'], string> = {
  queued: 'gold',
  running: 'processing',
  succeeded: 'success',
  failed: 'error',
};

const learningStatusColor: Record<WechatAiHistoryLearningTask['status'], string> = {
  ...jobStatusColor,
  paused: 'default',
  canceled: 'default',
};

const jobStatusLabel: Record<WechatAiHistoryLearningTask['status'], string> = {
  queued: '排队中',
  running: '执行中',
  succeeded: '成功',
  failed: '失败',
  paused: '已暂停',
  canceled: '已取消',
};

const learningStageLabel: Record<WechatAiHistoryLearningTask['stage'], string> = {
  segment: '分段总结',
  profile_merge: '画像合并',
  culture_update: '群文化更新',
  persona_candidate: '人格候选',
  done: '完成',
};

const jsonText = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

const summaryText = (run?: WechatAiMemoryRun) => {
  const value = run?.resultJson?.summary;
  return typeof value === 'string' ? value : '-';
};

const qualityScore = (run?: WechatAiMemoryRun) => {
  const value = Number(run?.resultJson?.qualityScore);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : undefined;
};

const qualityReasonText = (run?: WechatAiMemoryRun) => {
  const value = run?.resultJson?.qualityReasons;
  return Array.isArray(value) ? value.join(' / ') : '';
};

const qualityColor = (score: number) => {
  if (score >= 80) return 'success';
  if (score >= 60) return 'processing';
  if (score >= 40) return 'warning';
  return 'error';
};

const qualityTag = (run?: WechatAiMemoryRun) => {
  const score = qualityScore(run);
  return score === undefined ? '-' : <Tag color={qualityColor(score)} title={qualityReasonText(run)}>{score}</Tag>;
};

const learningPercent = (task: WechatAiHistoryLearningTask) => (
  task.totalMsgCount > 0 ? Math.round((task.processedMsgCount / task.totalMsgCount) * 100) : 0
);

const learningProgressStatus = (status: WechatAiHistoryLearningTask['status']) => {
  if (status === 'failed') return 'exception';
  if (status === 'succeeded') return 'success';
  if (status === 'queued' || status === 'running') return 'active';
  return 'normal';
};

type LearningAction = 'pause' | 'resume' | 'cancel' | 'retry';
const learningActionLabel: Record<LearningAction, string> = {
  pause: '暂停',
  resume: '继续',
  cancel: '取消',
  retry: '重跑',
};

export default function WechatAiMemory() {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string>();
  const [creatingLearning, setCreatingLearning] = useState(false);
  const [status, setStatus] = useState<WechatAiStatus>();
  const [groups, setGroups] = useState<WechatGroup[]>([]);
  const [jobs, setJobs] = useState<WechatAiJob[]>([]);
  const [errors, setErrors] = useState<WechatAiError[]>([]);
  const [learningTasks, setLearningTasks] = useState<WechatAiHistoryLearningTask[]>([]);
  const [runs, setRuns] = useState<WechatAiMemoryRun[]>([]);
  const [profiles, setProfiles] = useState<WechatAiProfile[]>([]);
  const [persona, setPersona] = useState<WechatAiPersona>();
  const [candidates, setCandidates] = useState<WechatAiPersonaCandidate[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [jsonModal, setJsonModal] = useState<{ title: string; value: unknown }>();
  const [evidenceModal, setEvidenceModal] = useState<WechatAiPersonaEvidence>();
  const [manualForm] = Form.useForm<ManualFormValues>();
  const [learningForm] = Form.useForm<LearningFormValues>();
  const manualJobType = Form.useWatch('jobType', manualForm);

  const groupNameByRoomId = new Map(groups.map((group) => [group.roomId, group.roomName || group.roomId]));
  const roomLabel = (roomId: string) => groupNameByRoomId.get(roomId) || roomId;
  const roomOptions = (status?.rooms || []).map((room) => ({ label: roomLabel(room.roomId), value: room.roomId }));
  const modelOptions = Array.from(new Set([
    status?.models.summary,
    status?.models.merge,
    status?.models.manualDeep,
  ].filter(Boolean))).map((model) => ({ label: model, value: model }));

  const loadOverview = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [nextStatus, nextJobs, nextErrors, nextLearning] = await Promise.all([
        getWechatAiStatus(),
        listWechatAiJobs({ limit: 100 }),
        listWechatAiErrors({ limit: 100 }),
        listWechatAiHistoryLearningTasks({ limit: 100 }),
      ]);
      setStatus(nextStatus);
      setJobs(nextJobs.items || []);
      setErrors(nextErrors.items || []);
      setLearningTasks(nextLearning.items || []);
      setSelectedRoomId((current) => (
        current && nextStatus.rooms.some((room) => room.roomId === current)
          ? current
          : nextStatus.rooms[0]?.roomId || ''
      ));
    } catch (error) {
      if (!quiet) message.error(error instanceof Error ? error.message : 'AI 状态加载失败');
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const loadMemory = async (roomId: string) => {
    if (!roomId) {
      setRuns([]);
      setProfiles([]);
      setPersona(undefined);
      setCandidates([]);
      return;
    }
    setMemoryLoading(true);
    try {
      const [nextRuns, nextProfiles, nextPersona, nextCandidates] = await Promise.all([
        listWechatAiMemoryRuns({ roomId, limit: 100 }),
        listWechatAiProfiles(roomId),
        getWechatAiRoomPersona(roomId),
        listWechatAiPersonaCandidates({ roomId, limit: 100 }),
      ]);
      setRuns(nextRuns.items || []);
      setProfiles(nextProfiles.items || []);
      setPersona('items' in nextPersona ? undefined : nextPersona);
      setCandidates(nextCandidates.items || []);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '记忆数据加载失败');
    } finally {
      setMemoryLoading(false);
    }
  };

  const refresh = async () => {
    await loadOverview();
    await loadMemory(selectedRoomId);
  };

  const createJob = async () => {
    const values = await manualForm.validateFields();
    try {
      await createWechatAiJob({
        roomId: values.roomId,
        jobType: values.jobType,
        start: values.start || undefined,
        end: values.end || undefined,
        model: values.model || undefined,
        reason: values.reason || undefined,
      });
      message.success('任务已提交');
      await loadOverview();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '任务提交失败');
    }
  };

  const createHistoryLearning = async () => {
    const values = await learningForm.validateFields();
    setCreatingLearning(true);
    try {
      await createWechatAiHistoryLearningTask({
        roomId: values.roomId,
        start: values.start || undefined,
        end: values.end || undefined,
        maxMessages: values.maxMessages || undefined,
      });
      message.success('历史聊天学习已开始');
      await loadOverview();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '历史聊天学习启动失败');
    } finally {
      setCreatingLearning(false);
    }
  };

  const retryError = async (errorId: number) => {
    const key = `error:retry:${errorId}`;
    setActionLoading(key);
    try {
      await retryWechatAiError(errorId);
      message.success('重试任务已提交');
      await loadOverview();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重试失败');
    } finally {
      setActionLoading(undefined);
    }
  };

  const resolveError = async (errorId: number) => {
    const key = `error:resolve:${errorId}`;
    setActionLoading(key);
    try {
      await resolveWechatAiError(errorId);
      message.success('失败记录已解决');
      await loadOverview();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setActionLoading(undefined);
    }
  };

  const reviewCandidate = async (candidateId: number, action: 'promote' | 'reject') => {
    const key = `candidate:${action}:${candidateId}`;
    setActionLoading(key);
    try {
      if (action === 'promote') {
        await promoteWechatAiPersonaCandidate(candidateId);
        message.success('人格候选已晋升');
      } else {
        await rejectWechatAiPersonaCandidate(candidateId);
        message.success('人格候选已拒绝');
      }
      await loadMemory(selectedRoomId);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '审核失败');
    } finally {
      setActionLoading(undefined);
    }
  };

  const applyHistoryLearningAction = async (taskId: number, action: LearningAction) => {
    const key = `learning:${action}:${taskId}`;
    setActionLoading(key);
    try {
      await updateWechatAiHistoryLearningTask(taskId, action);
      message.success(`历史聊天学习已${learningActionLabel[action]}`);
      await loadOverview();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '历史聊天学习操作失败');
    } finally {
      setActionLoading(undefined);
    }
  };

  const controlHistoryLearning = (task: WechatAiHistoryLearningTask, action: LearningAction) => {
    if (action !== 'cancel') {
      void applyHistoryLearningAction(task.id, action);
      return;
    }
    Modal.confirm({
      title: `取消历史聊天学习 #${task.id}？`,
      content: '取消后不会继续推进当前学习任务，已沉淀的分段记忆会保留。',
      okText: '取消任务',
      okButtonProps: { danger: true },
      cancelText: '返回',
      onOk: () => applyHistoryLearningAction(task.id, action),
    });
  };

  const openCandidateEvidence = async (candidateId: number) => {
    const key = `candidate:evidence:${candidateId}`;
    setActionLoading(key);
    try {
      setEvidenceModal(await getWechatAiPersonaCandidateEvidence(candidateId));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '证据加载失败');
    } finally {
      setActionLoading(undefined);
    }
  };

  useEffect(() => {
    void loadOverview();
    void listWechatGroups()
      .then(setGroups)
      .catch((error) => message.error(error instanceof Error ? error.message : '群聊列表加载失败'));
    const timer = window.setInterval(() => void loadOverview(true), 12000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadMemory(selectedRoomId);
    manualForm.setFieldValue('roomId', selectedRoomId);
    learningForm.setFieldValue('roomId', selectedRoomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId]);

  const jobsColumns: ColumnsType<WechatAiJob> = [
    { title: '任务', dataIndex: 'id', width: 82, render: (value) => `#${value}` },
    { title: '群聊', dataIndex: 'roomId', ellipsis: true, render: (value: string) => roomLabel(value) },
    { title: '类型', dataIndex: 'jobType', width: 112, render: (value: WechatAiJob['jobType']) => jobTypeLabel[value] },
    { title: '状态', dataIndex: 'status', width: 100, render: (value: WechatAiJob['status']) => <Tag color={jobStatusColor[value]}>{jobStatusLabel[value]}</Tag> },
    { title: '模型', dataIndex: 'model', width: 112, ellipsis: true },
    { title: '输入', dataIndex: 'inputMsgCount', width: 78, render: (value) => value || '-' },
    { title: '完成时间', dataIndex: 'finishedAt', width: 170, render: (value) => formatWechatTime(value) || '-' },
    {
      title: '结果',
      width: 76,
      render: (_, row) => row.resultJson ? (
        <Button type="text" icon={<EyeOutlined />} aria-label="查看任务结果" onClick={() => setJsonModal({ title: `任务 #${row.id}`, value: row.resultJson })} />
      ) : '-',
    },
  ];

  const errorsColumns: ColumnsType<WechatAiError> = [
    { title: '失败', dataIndex: 'id', width: 76, render: (value) => `#${value}` },
    { title: '群聊', dataIndex: 'roomId', ellipsis: true, render: (value: string) => roomLabel(value) },
    { title: '类型', dataIndex: 'jobType', width: 112, render: (value: WechatAiJob['jobType']) => jobTypeLabel[value] },
    { title: '错误', dataIndex: 'errorMessage', ellipsis: true },
    { title: '耗时', dataIndex: 'elapsedMs', width: 94, render: (value) => `${value || 0} ms` },
    { title: '时间', dataIndex: 'createdAt', width: 170, render: (value) => formatWechatTime(value) || '-' },
    {
      title: '操作',
      width: 150,
      render: (_, row) => row.resolved ? <Tag>已解决</Tag> : (
        <Space size={0}>
          <Button type="text" icon={<RedoOutlined />} loading={actionLoading === `error:retry:${row.id}`} aria-label="重试失败任务" onClick={() => void retryError(row.id)} />
          <Button type="text" icon={<CheckOutlined />} loading={actionLoading === `error:resolve:${row.id}`} aria-label="标记失败已解决" onClick={() => void resolveError(row.id)} />
          {row.requestMetaJson ? <Button type="text" icon={<EyeOutlined />} aria-label="查看失败元数据" onClick={() => setJsonModal({ title: `失败 #${row.id}`, value: row.requestMetaJson })} /> : null}
        </Space>
      ),
    },
  ];

  const learningColumns: ColumnsType<WechatAiHistoryLearningTask> = [
    { title: '任务', dataIndex: 'id', width: 82, render: (value) => `#${value}` },
    { title: '群聊', dataIndex: 'roomId', ellipsis: true, render: (value: string) => roomLabel(value) },
    { title: '状态', dataIndex: 'status', width: 100, render: (value: WechatAiHistoryLearningTask['status']) => <Tag color={learningStatusColor[value]}>{jobStatusLabel[value]}</Tag> },
    { title: '阶段', dataIndex: 'stage', width: 118, render: (value: WechatAiHistoryLearningTask['stage']) => learningStageLabel[value] || value },
    {
      title: '进度',
      width: 190,
      render: (_, row) => <Progress percent={learningPercent(row)} size="small" status={learningProgressStatus(row.status)} />,
    },
    { title: '消息', width: 120, render: (_, row) => `${row.processedMsgCount || 0}/${row.totalMsgCount || 0}` },
    { title: '分段', dataIndex: 'segmentJobCount', width: 82 },
    { title: '当前子任务', dataIndex: 'currentJobId', width: 108, render: (value) => value ? `#${value}` : '-' },
    { title: '更新时间', dataIndex: 'updatedAt', width: 170, render: (value) => formatWechatTime(value) || '-' },
    { title: '错误', dataIndex: 'errorMessage', ellipsis: true, render: (value) => value || '-' },
    {
      title: '操作',
      width: 142,
      render: (_, row) => (
        <Space size={0}>
          {row.status === 'queued' || row.status === 'running' ? <Button type="text" icon={<PauseCircleOutlined />} loading={actionLoading === `learning:pause:${row.id}`} aria-label="暂停历史聊天学习" onClick={() => controlHistoryLearning(row, 'pause')} /> : null}
          {row.status === 'paused' ? <Button type="text" icon={<PlayCircleOutlined />} loading={actionLoading === `learning:resume:${row.id}`} aria-label="继续历史聊天学习" onClick={() => controlHistoryLearning(row, 'resume')} /> : null}
          {row.status === 'failed' ? <Button type="text" icon={<RedoOutlined />} loading={actionLoading === `learning:retry:${row.id}`} aria-label="重跑历史聊天学习当前阶段" onClick={() => controlHistoryLearning(row, 'retry')} /> : null}
          {row.status !== 'succeeded' && row.status !== 'canceled' ? <Button type="text" danger icon={<StopOutlined />} loading={actionLoading === `learning:cancel:${row.id}`} aria-label="取消历史聊天学习" onClick={() => controlHistoryLearning(row, 'cancel')} /> : null}
        </Space>
      ),
    },
  ];

  const runsColumns: ColumnsType<WechatAiMemoryRun> = [
    { title: '记忆', dataIndex: 'id', width: 82, render: (value) => `#${value}` },
    { title: '片段结束', dataIndex: 'windowEnd', width: 170, render: (value) => formatWechatTime(value) || '-' },
    { title: '消息数', dataIndex: 'inputMsgCount', width: 86 },
    { title: '质量', width: 82, render: (_, row) => qualityTag(row) },
    { title: '摘要', render: (_, row) => <Typography.Text ellipsis={{ tooltip: summaryText(row) }}>{summaryText(row)}</Typography.Text> },
    { title: '详情', width: 72, render: (_, row) => <Button type="text" icon={<EyeOutlined />} aria-label="查看分段记忆" onClick={() => setJsonModal({ title: `记忆 #${row.id}`, value: row.resultJson })} /> },
  ];

  const profilesColumns: ColumnsType<WechatAiProfile> = [
    { title: '成员', dataIndex: 'displayName', render: (value, row) => value || row.memberWxid, ellipsis: true },
    { title: 'wxid', dataIndex: 'memberWxid', ellipsis: true },
    { title: '置信度', dataIndex: 'confidence', width: 90, render: (value) => Number(value || 0).toFixed(2) },
    { title: '证据', dataIndex: 'evidenceMsgIds', width: 76, render: (value) => Array.isArray(value) ? value.length : 0 },
    { title: '更新', dataIndex: 'updatedAt', width: 170, render: (value) => formatWechatTime(value) || '-' },
    { title: '详情', width: 72, render: (_, row) => <Button type="text" icon={<EyeOutlined />} aria-label="查看成员画像" onClick={() => setJsonModal({ title: row.displayName || row.memberWxid, value: row.profileJson })} /> },
  ];

  const candidatesColumns: ColumnsType<WechatAiPersonaCandidate> = [
    { title: '候选', dataIndex: 'id', width: 82, render: (value) => `#${value}` },
    { title: '状态', dataIndex: 'status', width: 100, render: (value) => <Tag color={value === 'pending' ? 'gold' : value === 'promoted' ? 'success' : 'default'}>{value === 'pending' ? '待审核' : value === 'promoted' ? '已晋升' : '已拒绝'}</Tag> },
    { title: '生成时间', dataIndex: 'createdAt', width: 170, render: (value) => formatWechatTime(value) || '-' },
    { title: '内容', render: (_, row) => <Button type="text" icon={<EyeOutlined />} aria-label="查看人格候选" onClick={() => setJsonModal({ title: `人格候选 #${row.id}`, value: row.candidateJson })} /> },
    { title: '证据', width: 72, render: (_, row) => <Button type="text" icon={<FileSearchOutlined />} loading={actionLoading === `candidate:evidence:${row.id}`} aria-label="查看人格候选证据" onClick={() => void openCandidateEvidence(row.id)} /> },
    {
      title: '审核',
      width: 112,
      render: (_, row) => row.status !== 'pending' ? '-' : (
        <Space size={0}>
          <Button type="text" icon={<CheckOutlined />} loading={actionLoading === `candidate:promote:${row.id}`} aria-label="晋升人格候选" onClick={() => void reviewCandidate(row.id, 'promote')} />
          <Button type="text" danger icon={<CloseOutlined />} loading={actionLoading === `candidate:reject:${row.id}`} aria-label="拒绝人格候选" onClick={() => void reviewCandidate(row.id, 'reject')} />
        </Space>
      ),
    },
  ];

  const queuedJobs = jobs.filter((job) => job.status === 'queued').length;
  const runningJobs = jobs.filter((job) => job.status === 'running').length;
  const failedJobs = jobs.filter((job) => job.status === 'failed').length;
  const evidenceRunColumns: ColumnsType<WechatAiMemoryRun> = [
    { title: '分段', dataIndex: 'id', width: 82, render: (value) => `#${value}` },
    { title: '时间', dataIndex: 'windowEnd', width: 170, render: (value) => formatWechatTime(value) || '-' },
    { title: '消息数', dataIndex: 'inputMsgCount', width: 86 },
    { title: '质量', width: 82, render: (_, row) => qualityTag(row) },
    { title: '摘要', render: (_, row) => <Typography.Text ellipsis={{ tooltip: summaryText(row) }}>{summaryText(row)}</Typography.Text> },
  ];
  const evidenceMessageColumns: ColumnsType<WechatMessage> = [
    { title: '时间', dataIndex: 'createdAt', width: 170, render: (value) => formatWechatTime(value) || '-' },
    { title: '成员', dataIndex: 'senderName', width: 150, ellipsis: true, render: (value, row) => value || row.senderWxid },
    { title: '内容', dataIndex: 'content', ellipsis: true },
  ];

  return (
    <>
      <PageHeader title="AI 记忆" description="微信 Bot" extra={<Button icon={<ReloadOutlined />} loading={loading} onClick={() => void refresh()}>刷新</Button>} />
      <Tabs
        items={[
          {
            key: 'overview',
            label: '任务概览',
            children: (
              <Space direction="vertical" size={16} style={{ display: 'flex' }}>
                {!status?.configured ? <Alert type="warning" showIcon message="AI 尚未完成配置" /> : null}
                <Row gutter={[16, 16]}>
                  <Col xs={12} md={6}><Card size="small"><Statistic title="排队" value={queuedJobs} /></Card></Col>
                  <Col xs={12} md={6}><Card size="small"><Statistic title="执行中" value={runningJobs} /></Card></Col>
                  <Col xs={12} md={6}><Card size="small"><Statistic title="失败" value={failedJobs} /></Card></Col>
                  <Col xs={12} md={6}><Card size="small"><Statistic title="群聊" value={status?.rooms.length || 0} /></Card></Col>
                </Row>
                <Card title="最近任务" loading={loading}>
                  <Table rowKey="id" size="small" columns={jobsColumns} dataSource={jobs} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 960 }} />
                </Card>
              </Space>
            ),
          },
          {
            key: 'history-learning',
            label: '历史聊天学习',
            children: (
              <Space direction="vertical" size={16} style={{ display: 'flex' }}>
                <Card>
                  <Form form={learningForm} layout="vertical" onFinish={() => void createHistoryLearning()}>
                    <Row gutter={[16, 0]}>
                      <Col xs={24} md={12}>
                        <Form.Item name="roomId" label="群聊" rules={[{ required: true, message: '请选择群聊' }]}>
                          <Select showSearch optionFilterProp="label" options={roomOptions} placeholder="选择群聊" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="maxMessages" label="最大消息数">
                          <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="不限制" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}><Form.Item name="start" label="开始时间"><Input type="datetime-local" /></Form.Item></Col>
                      <Col xs={24} md={12}><Form.Item name="end" label="结束时间"><Input type="datetime-local" /></Form.Item></Col>
                    </Row>
                    <Button type="primary" icon={<PlayCircleOutlined />} loading={creatingLearning} htmlType="submit">开始学习</Button>
                  </Form>
                </Card>
                <Card title="学习进度" loading={loading}>
                  <Table rowKey="id" size="small" columns={learningColumns} dataSource={learningTasks} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 1320 }} />
                </Card>
              </Space>
            ),
          },
          {
            key: 'manual',
            label: '手动补偿',
            children: (
              <Card>
                <Form form={manualForm} layout="vertical" onFinish={() => void createJob()}>
                  <Row gutter={[16, 0]}>
                    <Col xs={24} md={12}>
                      <Form.Item name="roomId" label="群聊" rules={[{ required: true, message: '请选择群聊' }]}>
                        <Select showSearch optionFilterProp="label" options={roomOptions} placeholder="选择群聊" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="jobType" label="任务类型" initialValue="segment_summary" rules={[{ required: true }]}>
                        <Select options={Object.entries(jobTypeLabel).filter(([value]) => value !== 'reply').map(([value, label]) => ({ value, label }))} />
                      </Form.Item>
                    </Col>
                    {manualJobType === 'segment_summary' ? (
                      <>
                        <Col xs={24} md={12}><Form.Item name="start" label="开始时间" rules={[{ required: true, message: '请选择开始时间' }]}><Input type="datetime-local" /></Form.Item></Col>
                        <Col xs={24} md={12}><Form.Item name="end" label="结束时间" rules={[{ required: true, message: '请选择结束时间' }]}><Input type="datetime-local" /></Form.Item></Col>
                      </>
                    ) : null}
                    <Col xs={24} md={12}><Form.Item name="model" label="模型"><Select allowClear options={modelOptions} placeholder="使用任务默认模型" /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="reason" label="原因"><Input maxLength={64} /></Form.Item></Col>
                  </Row>
                  <Button type="primary" htmlType="submit">提交任务</Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'errors',
            label: '失败记录',
            children: (
              <Card loading={loading}>
                <Table rowKey="id" size="small" columns={errorsColumns} dataSource={errors} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 980 }} />
              </Card>
            ),
          },
          {
            key: 'memory',
            label: '记忆查看',
            children: (
              <Space direction="vertical" size={16} style={{ display: 'flex' }}>
                <Select value={selectedRoomId || undefined} showSearch optionFilterProp="label" options={roomOptions} placeholder="选择群聊" onChange={setSelectedRoomId} style={{ maxWidth: 420 }} />
                {selectedRoomId ? (
                  <Tabs
                    items={[
                      { key: 'runs', label: '分段记忆', children: <Table loading={memoryLoading} rowKey="id" size="small" columns={runsColumns} dataSource={runs} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 820 }} /> },
                      { key: 'profiles', label: '成员画像', children: <Table loading={memoryLoading} rowKey="memberWxid" size="small" columns={profilesColumns} dataSource={profiles} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 820 }} /> },
                      {
                        key: 'persona',
                        label: '群文化与人格',
                        children: (
                          <Row gutter={[16, 16]}>
                            <Col xs={24} lg={12}><Card size="small" title="群文化" extra={<Button type="text" icon={<EyeOutlined />} aria-label="查看群文化" onClick={() => setJsonModal({ title: '群文化', value: persona?.roomCultureJson })} />}><Typography.Paragraph ellipsis={{ rows: 8, expandable: true }}>{jsonText(persona?.roomCultureJson)}</Typography.Paragraph></Card></Col>
                            <Col xs={24} lg={12}><Card size="small" title="稳定人格" extra={<Button type="text" icon={<EyeOutlined />} aria-label="查看稳定人格" onClick={() => setJsonModal({ title: '稳定人格', value: persona?.botPersonaJson })} />}><Typography.Paragraph ellipsis={{ rows: 8, expandable: true }}>{jsonText(persona?.botPersonaJson)}</Typography.Paragraph></Card></Col>
                            <Col span={24}><Card size="small" title="人格候选"><Table loading={memoryLoading} rowKey="id" size="small" columns={candidatesColumns} dataSource={candidates} pagination={{ pageSize: 8, showSizeChanger: false }} scroll={{ x: 700 }} /></Card></Col>
                          </Row>
                        ),
                      },
                    ]}
                  />
                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
              </Space>
            ),
          },
        ]}
      />
      <Modal open={Boolean(jsonModal)} title={jsonModal?.title} footer={null} onCancel={() => setJsonModal(undefined)} width={760}>
        <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{jsonText(jsonModal?.value)}</Typography.Paragraph>
      </Modal>
      <Modal open={Boolean(evidenceModal)} title={evidenceModal ? `人格候选 #${evidenceModal.candidate.id} 证据` : '人格候选证据'} footer={null} onCancel={() => setEvidenceModal(undefined)} width={920}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card size="small" title="候选内容">
            <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{jsonText(evidenceModal?.candidate.candidateJson)}</Typography.Paragraph>
          </Card>
          <Card size="small" title="分段证据">
            <Table rowKey="id" size="small" columns={evidenceRunColumns} dataSource={evidenceModal?.runs || []} pagination={false} scroll={{ x: 620 }} />
          </Card>
          <Card size="small" title="原始消息">
            <Table rowKey="msgId" size="small" columns={evidenceMessageColumns} dataSource={evidenceModal?.messages || []} pagination={{ pageSize: 8, showSizeChanger: false }} scroll={{ x: 720 }} />
          </Card>
        </Space>
      </Modal>
    </>
  );
}
