import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DislikeOutlined,
  EyeOutlined,
  FileSearchOutlined,
  LikeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RedoOutlined,
  StopOutlined,
  WarningOutlined,
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
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import {
  createWechatAiHistoryLearningTask,
  createWechatAiJob,
  createWechatAiReplyConversationSample,
  createWechatAiReplyStyleSample,
  deleteWechatAiReplyConversationSample,
  deleteWechatAiReplyStyleSample,
  getWechatAiObservation,
  getWechatAiRoleCard,
  getWechatAiRoomPersona,
  getWechatAiPersonaCandidateEvidence,
  getWechatAiStatus,
  listWechatGroups,
  listWechatAiHistoryLearningTasks,
  listWechatAiErrors,
  listWechatAiJobs,
  listWechatAiMemoryRuns,
  listWechatAiPersonaCandidates,
  listWechatAiPersonaVersions,
  listWechatAiProfiles,
  listWechatAiReplyConversationSamples,
  listWechatAiReplyLogs,
  listWechatAiReplyStyleSamples,
  promoteWechatAiPersonaCandidate,
  rejectWechatAiPersonaCandidate,
  rollbackWechatAiPersonaVersion,
  resolveWechatAiError,
  retryWechatAiError,
  reviewWechatAiReplyLog,
  updateWechatAiRoleCard,
  updateWechatAiHistoryLearningTask,
  type WechatAiError,
  type WechatAiHistoryLearningTask,
  type WechatAiJob,
  type WechatAiMemoryRun,
  type WechatAiObservation,
  type WechatAiPersona,
  type WechatAiPersonaCandidate,
  type WechatAiPersonaEvidence,
  type WechatAiPersonaVersion,
  type WechatAiProfile,
  type WechatAiReplyConversationSample,
  type WechatAiReplyLog,
  type WechatAiReplyStyleSample,
  type WechatAiRoleCard,
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
type RoleCardFormValues = { content: string };
type ReplySampleFormValues = {
  roomId?: string;
  scenario?: string;
  triggerText: string;
  replyText: string;
};
type ReplyConversationSampleFormValues = {
  roomId?: string;
  scenario?: string;
  contextText: string;
  replyText: string;
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

export const observationErrorCount = (errors: WechatAiError[] | null | undefined) => errors?.length || 0;

type LearningAction = 'pause' | 'resume' | 'cancel' | 'retry';
const learningActionLabel: Record<LearningAction, string> = {
  pause: '暂停',
  resume: '继续',
  cancel: '取消',
  retry: '重跑',
};

const personaVersionSourceLabel = (source?: string) => ({
  candidate_promote: '候选晋升',
  rollback: '回滚生效',
  rollback_backup: '回滚备份',
}[source || ''] || source || '-');

type ReplyFeedback = Exclude<NonNullable<WechatAiReplyLog['feedback']>, ''>;

const feedbackLabel: Record<ReplyFeedback, string> = {
  human: '像人',
  too_ai: '太 AI',
  too_much: '太过火',
};

const feedbackColor: Record<ReplyFeedback, string> = {
  human: 'success',
  too_ai: 'warning',
  too_much: 'error',
};

const scenarioLabel: Record<string, string> = {
  general: '日常接话',
  greeting: '招呼',
  quote: '引用回复',
  game: '游戏接龙',
  teasing: '调侃',
  meme: '玩梗',
};

export default function WechatAiMemory() {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [styleLoading, setStyleLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string>();
  const [creatingLearning, setCreatingLearning] = useState(false);
  const [savingRoleCard, setSavingRoleCard] = useState(false);
  const [creatingReplySample, setCreatingReplySample] = useState(false);
  const [creatingConversationSample, setCreatingConversationSample] = useState(false);
  const [status, setStatus] = useState<WechatAiStatus>();
  const [groups, setGroups] = useState<WechatGroup[]>([]);
  const [observation, setObservation] = useState<WechatAiObservation>();
  const [jobs, setJobs] = useState<WechatAiJob[]>([]);
  const [errors, setErrors] = useState<WechatAiError[]>([]);
  const [learningTasks, setLearningTasks] = useState<WechatAiHistoryLearningTask[]>([]);
  const [runs, setRuns] = useState<WechatAiMemoryRun[]>([]);
  const [profiles, setProfiles] = useState<WechatAiProfile[]>([]);
  const [persona, setPersona] = useState<WechatAiPersona>();
  const [candidates, setCandidates] = useState<WechatAiPersonaCandidate[]>([]);
  const [personaVersions, setPersonaVersions] = useState<WechatAiPersonaVersion[]>([]);
  const [roleCard, setRoleCard] = useState<WechatAiRoleCard>();
  const [replySamples, setReplySamples] = useState<WechatAiReplyStyleSample[]>([]);
  const [conversationSamples, setConversationSamples] = useState<WechatAiReplyConversationSample[]>([]);
  const [replyLogs, setReplyLogs] = useState<WechatAiReplyLog[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [jsonModal, setJsonModal] = useState<{ title: string; value: unknown }>();
  const [evidenceModal, setEvidenceModal] = useState<WechatAiPersonaEvidence>();
  const [manualForm] = Form.useForm<ManualFormValues>();
  const [learningForm] = Form.useForm<LearningFormValues>();
  const [roleCardForm] = Form.useForm<RoleCardFormValues>();
  const [replySampleForm] = Form.useForm<ReplySampleFormValues>();
  const [conversationSampleForm] = Form.useForm<ReplyConversationSampleFormValues>();
  const manualJobType = Form.useWatch('jobType', manualForm);

  const groupNameByRoomId = new Map<string, string>();
  groups.forEach((group) => groupNameByRoomId.set(group.roomId, group.roomName || group.roomId));
  (status?.rooms || []).forEach((room) => {
    if (room.roomName) groupNameByRoomId.set(room.roomId, room.roomName);
  });
  const roomLabel = (roomId: string) => groupNameByRoomId.get(roomId) || roomId;
  const roomOptions = groups.map((group) => ({ label: roomLabel(group.roomId), value: group.roomId }));
  const modelOptions = Array.from(new Set([
    status?.models.summary,
    status?.models.merge,
    status?.models.manualDeep,
  ].filter(Boolean))).map((model) => ({ label: model, value: model }));

  const loadOverview = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [nextStatus, nextJobs, nextErrors, nextLearning, nextObservation] = await Promise.all([
        getWechatAiStatus(),
        listWechatAiJobs({ limit: 100 }),
        listWechatAiErrors({ limit: 100 }),
        listWechatAiHistoryLearningTasks({ limit: 100 }),
        getWechatAiObservation({ days: 7 }),
      ]);
      setStatus(nextStatus);
      setJobs(nextJobs.items || []);
      setErrors(nextErrors.items || []);
      setLearningTasks(nextLearning.items || []);
      setObservation(nextObservation);
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
      setPersonaVersions([]);
      return;
    }
    setMemoryLoading(true);
    try {
      const [nextRuns, nextProfiles, nextPersona, nextCandidates, nextVersions] = await Promise.all([
        listWechatAiMemoryRuns({ roomId, limit: 100 }),
        listWechatAiProfiles(roomId),
        getWechatAiRoomPersona(roomId),
        listWechatAiPersonaCandidates({ roomId, limit: 100 }),
        listWechatAiPersonaVersions({ roomId, limit: 100 }),
      ]);
      setRuns(nextRuns.items || []);
      setProfiles(nextProfiles.items || []);
      setPersona('items' in nextPersona ? undefined : nextPersona);
      setCandidates(nextCandidates.items || []);
      setPersonaVersions(nextVersions.items || []);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '记忆数据加载失败');
    } finally {
      setMemoryLoading(false);
    }
  };

  const loadStyle = async (quiet = false) => {
    if (!quiet) setStyleLoading(true);
    try {
      const [nextRoleCard, nextSamples, nextConversationSamples, nextLogs] = await Promise.all([
        getWechatAiRoleCard(),
        listWechatAiReplyStyleSamples({ limit: 200 }),
        listWechatAiReplyConversationSamples({ limit: 200 }),
        listWechatAiReplyLogs({ limit: 100 }),
      ]);
      setRoleCard(nextRoleCard);
      setReplySamples(nextSamples.items || []);
      setConversationSamples(nextConversationSamples.items || []);
      setReplyLogs(nextLogs.items || []);
      roleCardForm.setFieldsValue({ content: nextRoleCard.content });
    } catch (error) {
      if (!quiet) message.error(error instanceof Error ? error.message : '角色与样本加载失败');
    } finally {
      if (!quiet) setStyleLoading(false);
    }
  };

  const refresh = async () => {
    await loadOverview();
    await loadMemory(selectedRoomId);
    await loadStyle();
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

  const saveRoleCard = async () => {
    const values = await roleCardForm.validateFields();
    setSavingRoleCard(true);
    try {
      const nextRoleCard = await updateWechatAiRoleCard(values.content || '');
      setRoleCard(nextRoleCard);
      roleCardForm.setFieldsValue({ content: nextRoleCard.content });
      message.success(nextRoleCard.isDefault ? '已恢复内置角色卡' : '角色卡已保存');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '角色卡保存失败');
    } finally {
      setSavingRoleCard(false);
    }
  };

  const createReplySample = async () => {
    const values = await replySampleForm.validateFields();
    setCreatingReplySample(true);
    try {
      await createWechatAiReplyStyleSample({
        roomId: values.roomId || undefined,
        scenario: values.scenario || 'general',
        triggerText: values.triggerText,
        replyText: values.replyText,
      });
      replySampleForm.setFieldsValue({ triggerText: '', replyText: '' });
      message.success('表达样本已加入回复召回');
      await loadStyle(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '表达样本保存失败');
    } finally {
      setCreatingReplySample(false);
    }
  };

  const deleteReplySample = (sample: WechatAiReplyStyleSample) => {
    Modal.confirm({
      title: '删除这个表达样本？',
      content: '删除后它不会再被实时回复召回。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '返回',
      onOk: async () => {
        const key = `sample:delete:${sample.id}`;
        setActionLoading(key);
        try {
          await deleteWechatAiReplyStyleSample(sample.id);
          message.success('表达样本已删除');
          await loadStyle(true);
        } catch (error) {
          message.error(error instanceof Error ? error.message : '删除表达样本失败');
        } finally {
          setActionLoading(undefined);
        }
      },
    });
  };

  const createReplyConversationSample = async () => {
    const values = await conversationSampleForm.validateFields();
    setCreatingConversationSample(true);
    try {
      await createWechatAiReplyConversationSample({
        roomId: values.roomId || undefined,
        scenario: values.scenario || 'general',
        contextText: values.contextText,
        replyText: values.replyText,
      });
      conversationSampleForm.setFieldsValue({ contextText: '', replyText: '' });
      message.success('对话片段已加入回复召回');
      await loadStyle(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '对话片段保存失败');
    } finally {
      setCreatingConversationSample(false);
    }
  };

  const deleteReplyConversationSample = (sample: WechatAiReplyConversationSample) => {
    Modal.confirm({
      title: '删除这个对话片段？',
      content: '删除后它不会再被实时回复召回。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '返回',
      onOk: async () => {
        const key = `conversation-sample:delete:${sample.id}`;
        setActionLoading(key);
        try {
          await deleteWechatAiReplyConversationSample(sample.id);
          message.success('对话片段已删除');
          await loadStyle(true);
        } catch (error) {
          message.error(error instanceof Error ? error.message : '删除对话片段失败');
        } finally {
          setActionLoading(undefined);
        }
      },
    });
  };

  const reviewReplyLog = async (log: WechatAiReplyLog, feedback: ReplyFeedback) => {
    const key = `reply-log:${feedback}:${log.id}`;
    setActionLoading(key);
    try {
      const result = await reviewWechatAiReplyLog(log.id, feedback);
      if (feedback === 'human') {
        message.success(result.sampleActive ? '已加入可召回的表达样本' : '已记录反馈，原消息不可用，未加入样本');
      } else {
        message.success(`已标记为${feedbackLabel[feedback]}`);
      }
      await loadStyle(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '回复反馈保存失败');
    } finally {
      setActionLoading(undefined);
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
      await loadOverview(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '审核失败');
    } finally {
      setActionLoading(undefined);
    }
  };

  const rollbackPersonaVersion = (version: WechatAiPersonaVersion) => {
    Modal.confirm({
      title: `回滚到人格版本 v${version.versionNo}？`,
      content: '回滚会立刻替换当前稳定人格，并保留回滚前快照。',
      okText: '回滚',
      okButtonProps: { danger: true },
      cancelText: '返回',
      onOk: async () => {
        const key = `persona:rollback:${version.id}`;
        setActionLoading(key);
        try {
          await rollbackWechatAiPersonaVersion(version.id);
          message.success('稳定人格已回滚');
          await loadMemory(selectedRoomId);
          await loadOverview(true);
        } catch (error) {
          message.error(error instanceof Error ? error.message : '回滚失败');
        } finally {
          setActionLoading(undefined);
        }
      },
    });
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
    void loadStyle();
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

  useEffect(() => {
    setSelectedRoomId((current) => (
      current && groups.some((group) => group.roomId === current)
        ? current
        : groups[0]?.roomId || ''
    ));
  }, [groups]);

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

  const personaVersionColumns: ColumnsType<WechatAiPersonaVersion> = [
    { title: '版本', dataIndex: 'versionNo', width: 82, render: (value) => `v${value}` },
    { title: '来源', dataIndex: 'sourceType', width: 112, render: (value) => personaVersionSourceLabel(value) },
    { title: '来源ID', dataIndex: 'sourceId', width: 86, render: (value) => value ? `#${value}` : '-' },
    { title: '时间', dataIndex: 'createdAt', width: 170, render: (value) => formatWechatTime(value) || '-' },
    { title: '备注', dataIndex: 'note', ellipsis: true, render: (value) => value || '-' },
    { title: '内容', width: 72, render: (_, row) => <Button type="text" icon={<EyeOutlined />} aria-label="查看人格版本" onClick={() => setJsonModal({ title: `人格版本 v${row.versionNo}`, value: row.botPersonaJson })} /> },
    {
      title: '操作',
      width: 86,
      render: (_, row) => <Button type="text" danger icon={<RedoOutlined />} loading={actionLoading === `persona:rollback:${row.id}`} aria-label="回滚人格版本" onClick={() => rollbackPersonaVersion(row)} />,
    },
  ];

  const observationJobColumns: ColumnsType<WechatAiObservation['jobStats'][number]> = [
    { title: '类型', dataIndex: 'jobType', render: (value: WechatAiJob['jobType']) => jobTypeLabel[value] || value },
    { title: '状态', dataIndex: 'status', width: 100, render: (value: WechatAiJob['status']) => <Tag color={jobStatusColor[value]}>{jobStatusLabel[value]}</Tag> },
    { title: '数量', dataIndex: 'count', width: 90 },
    { title: '平均输入', dataIndex: 'avgInputMsgCount', width: 110, render: (value) => Number(value || 0).toFixed(1) },
  ];

  const queuedJobs = jobs.filter((job) => job.status === 'queued').length;
  const runningJobs = jobs.filter((job) => job.status === 'running').length;
  const failedJobs = jobs.filter((job) => job.status === 'failed').length;
  const observedSegments = Number(observation?.memoryStats?.segmentCount || 0);
  const observedAvgQuality = Number(observation?.memoryStats?.avgQualityScore || 0);
  const observedLowQuality = Number(observation?.memoryStats?.lowQualityCount || 0);
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
  const replySampleColumns: ColumnsType<WechatAiReplyStyleSample> = [
    { title: '范围', dataIndex: 'roomId', width: 150, ellipsis: true, render: (value) => value ? roomLabel(value) : <Tag>全局</Tag> },
    { title: '场景', dataIndex: 'scenario', width: 108, render: (value) => scenarioLabel[value] || value || '日常接话' },
    { title: '用户的话', dataIndex: 'triggerText', ellipsis: true },
    { title: '理想接话', dataIndex: 'replyText', ellipsis: true },
    { title: '更新时间', dataIndex: 'updatedAt', width: 170, render: (value) => formatWechatTime(value) || '-' },
    {
      title: '操作',
      width: 72,
      render: (_, row) => (
        <Tooltip title="删除表达样本">
          <Button type="text" danger icon={<DeleteOutlined />} loading={actionLoading === `sample:delete:${row.id}`} aria-label="删除表达样本" onClick={() => deleteReplySample(row)} />
        </Tooltip>
      ),
    },
  ];
  const conversationSampleColumns: ColumnsType<WechatAiReplyConversationSample> = [
    { title: '范围', dataIndex: 'roomId', width: 150, ellipsis: true, render: (value) => value ? roomLabel(value) : <Tag>全局</Tag> },
    { title: '场景', dataIndex: 'scenario', width: 108, render: (value) => scenarioLabel[value] || value || '日常接话' },
    { title: '前文对话', dataIndex: 'contextText', ellipsis: true },
    { title: '理想接话', dataIndex: 'replyText', ellipsis: true },
    { title: '更新时间', dataIndex: 'updatedAt', width: 170, render: (value) => formatWechatTime(value) || '-' },
    {
      title: '操作',
      width: 72,
      render: (_, row) => (
        <Tooltip title="删除对话片段">
          <Button type="text" danger icon={<DeleteOutlined />} loading={actionLoading === `conversation-sample:delete:${row.id}`} aria-label="删除对话片段" onClick={() => deleteReplyConversationSample(row)} />
        </Tooltip>
      ),
    },
  ];
  const replyLogColumns: ColumnsType<WechatAiReplyLog> = [
    { title: '群聊', dataIndex: 'roomId', width: 150, ellipsis: true, render: (value) => roomLabel(value) },
    { title: '触发消息', dataIndex: 'triggerContent', ellipsis: true, render: (value) => value || '-' },
    { title: '机器人回复', dataIndex: 'replyText', ellipsis: true },
    {
      title: '反馈',
      dataIndex: 'feedback',
      width: 92,
      render: (value: WechatAiReplyLog['feedback']) => {
        const feedback = value as ReplyFeedback;
        return feedback && feedbackLabel[feedback] ? <Tag color={feedbackColor[feedback]}>{feedbackLabel[feedback]}</Tag> : '-';
      },
    },
    { title: '时间', dataIndex: 'createdAt', width: 170, render: (value) => formatWechatTime(value) || '-' },
    {
      title: '操作',
      width: 126,
      render: (_, row) => (
        <Space size={0}>
          <Tooltip title="像人，加入样本库">
            <Button type="text" icon={<LikeOutlined />} loading={actionLoading === `reply-log:human:${row.id}`} aria-label="像人，加入样本库" onClick={() => void reviewReplyLog(row, 'human')} />
          </Tooltip>
          <Tooltip title="太 AI">
            <Button type="text" icon={<DislikeOutlined />} loading={actionLoading === `reply-log:too_ai:${row.id}`} aria-label="太 AI" onClick={() => void reviewReplyLog(row, 'too_ai')} />
          </Tooltip>
          <Tooltip title="太过火">
            <Button type="text" danger icon={<WarningOutlined />} loading={actionLoading === `reply-log:too_much:${row.id}`} aria-label="太过火" onClick={() => void reviewReplyLog(row, 'too_much')} />
          </Tooltip>
        </Space>
      ),
    },
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
                  <Col xs={12} md={6}><Card size="small"><Statistic title="群聊" value={groups.length} /></Card></Col>
                </Row>
                <Card title="最近任务" loading={loading}>
                  <Table rowKey="id" size="small" columns={jobsColumns} dataSource={jobs} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 960 }} />
                </Card>
              </Space>
            ),
          },
          {
            key: 'observation',
            label: '观察面板',
            children: (
              <Space direction="vertical" size={16} style={{ display: 'flex' }}>
                <Row gutter={[16, 16]}>
                  <Col xs={12} md={6}><Card size="small"><Statistic title="7天分段" value={observedSegments} /></Card></Col>
                  <Col xs={12} md={6}><Card size="small"><Statistic title="平均质量" value={observedAvgQuality} precision={1} /></Card></Col>
                  <Col xs={12} md={6}><Card size="small"><Statistic title="低质量" value={observedLowQuality} /></Card></Col>
                  <Col xs={12} md={6}><Card size="small"><Statistic title="未解决失败" value={observationErrorCount(observation?.recentErrors)} /></Card></Col>
                </Row>
                <Card title="任务分布" loading={loading}>
                  <Table rowKey={(row) => `${row.jobType}:${row.status}`} size="small" columns={observationJobColumns} dataSource={observation?.jobStats || []} pagination={false} />
                </Card>
                <Card title="进行中的历史学习" loading={loading}>
                  <Table rowKey="id" size="small" columns={learningColumns} dataSource={observation?.activeLearning || []} pagination={false} scroll={{ x: 1320 }} />
                </Card>
                <Card title="最近未解决失败" loading={loading}>
                  <Table rowKey="id" size="small" columns={errorsColumns} dataSource={observation?.recentErrors || []} pagination={false} scroll={{ x: 980 }} />
                </Card>
                <Card title="最近人格版本" loading={loading}>
                  <Table rowKey="id" size="small" columns={personaVersionColumns} dataSource={observation?.recentVersions || []} pagination={false} scroll={{ x: 720 }} />
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
            key: 'style',
            label: '角色与样本',
            children: (
              <Space direction="vertical" size={16} style={{ display: 'flex' }}>
                <Card title="角色卡" loading={styleLoading}>
                  <Form form={roleCardForm} layout="vertical" onFinish={() => void saveRoleCard()}>
                    <Form.Item name="content" label="稳定角色" rules={[{ max: 8000, message: '角色卡不能超过 8000 个字符' }]}>
                      <Input.TextArea autoSize={{ minRows: 5, maxRows: 10 }} />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={savingRoleCard}>保存角色卡</Button>
                    {roleCard?.isDefault ? <Tag style={{ marginLeft: 8 }}>内置默认</Tag> : null}
                  </Form>
                </Card>
                <Card title="添加表达样本" loading={styleLoading}>
                  <Form form={replySampleForm} layout="vertical" initialValues={{ scenario: 'general' }} onFinish={() => void createReplySample()}>
                    <Row gutter={[16, 0]}>
                      <Col xs={24} md={8}>
                        <Form.Item name="roomId" label="适用群聊">
                          <Select allowClear showSearch optionFilterProp="label" options={roomOptions} placeholder="留空则全局生效" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name="scenario" label="场景">
                          <Select options={Object.entries(scenarioLabel).map(([value, label]) => ({ value, label }))} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={[16, 0]}>
                      <Col xs={24} md={12}>
                        <Form.Item name="triggerText" label="用户的话" rules={[{ required: true, message: '请输入用户的话' }, { max: 2000, message: '不能超过 2000 个字符' }]}>
                          <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="replyText" label="理想接话" rules={[{ required: true, message: '请输入理想接话' }, { max: 1000, message: '不能超过 1000 个字符' }]}>
                          <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Button type="primary" htmlType="submit" loading={creatingReplySample}>加入样本库</Button>
                  </Form>
                </Card>
                <Card title="添加对话片段样本" loading={styleLoading}>
                  <Form form={conversationSampleForm} layout="vertical" initialValues={{ scenario: 'general' }} onFinish={() => void createReplyConversationSample()}>
                    <Row gutter={[16, 0]}>
                      <Col xs={24} md={8}>
                        <Form.Item name="roomId" label="适用群聊">
                          <Select allowClear showSearch optionFilterProp="label" options={roomOptions} placeholder="留空则全局生效" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item name="scenario" label="场景">
                          <Select options={Object.entries(scenarioLabel).map(([value, label]) => ({ value, label }))} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={[16, 0]}>
                      <Col xs={24} md={14}>
                        <Form.Item name="contextText" label="前文对话" rules={[{ required: true, message: '请输入前文对话' }, { max: 8000, message: '不能超过 8000 个字符' }]}>
                          <Input.TextArea autoSize={{ minRows: 4, maxRows: 10 }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={10}>
                        <Form.Item name="replyText" label="理想接话" rules={[{ required: true, message: '请输入理想接话' }, { max: 1000, message: '不能超过 1000 个字符' }]}>
                          <Input.TextArea autoSize={{ minRows: 4, maxRows: 10 }} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Button type="primary" htmlType="submit" loading={creatingConversationSample}>加入对话样本库</Button>
                  </Form>
                </Card>
                <Card title="生效样本" loading={styleLoading}>
                  <Table rowKey="id" size="small" columns={replySampleColumns} dataSource={replySamples} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 980 }} />
                </Card>
                <Card title="对话片段样本" loading={styleLoading}>
                  <Table rowKey="id" size="small" columns={conversationSampleColumns} dataSource={conversationSamples} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 980 }} />
                </Card>
                <Card title="最近 AI 回复" loading={styleLoading}>
                  <Table rowKey="id" size="small" columns={replyLogColumns} dataSource={replyLogs} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 1080 }} />
                </Card>
              </Space>
            ),
          },
          {
            key: 'memory',
            label: '记忆查看',
            children: (
              <Space direction="vertical" size={16} style={{ display: 'flex' }}>
                <Select value={selectedRoomId || undefined} showSearch optionFilterProp="label" options={roomOptions} placeholder="选择群聊" onChange={setSelectedRoomId} style={{ width: '100%', maxWidth: 680 }} />
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
                            <Col span={24}><Card size="small" title="人格版本"><Table loading={memoryLoading} rowKey="id" size="small" columns={personaVersionColumns} dataSource={personaVersions} pagination={{ pageSize: 8, showSizeChanger: false }} scroll={{ x: 720 }} /></Card></Col>
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
