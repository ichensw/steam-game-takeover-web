import { http, unwrap } from './http';
import type { ApiUnixTime } from '../utils/wechatBot';

export type WechatGroup = {
  roomId: string;
  roomName: string;
  memberCount: number;
  ownerWxid: string;
  updatedAt: ApiUnixTime;
};

export type WechatMessage = {
  msgId: string;
  roomId: string;
  senderWxid: string;
  senderName: string;
  msgType: number;
  subType?: string;
  content?: string;
  xmlContent?: string;
  mediaUrl?: string;
  mediaLocalPath?: string;
  mediaOssKey?: string;
  createdAt: ApiUnixTime | string;
};

export type Pagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type WechatPage<T> = {
  data: T[];
  pagination: Pagination;
};

export type WechatMessageQuery = {
  roomId?: string;
  sender?: string;
  keyword?: string;
  msgType?: number | string;
  subType?: string;
  start?: string;
  end?: string;
  page: number;
  pageSize: number;
};

export type WechatSummaryRequest = {
  roomId?: string;
  date?: string;
  period: string;
  start?: string;
  end?: string;
};

export type WechatSummaryJob = {
  id: number;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  roomId?: string;
  roomName?: string;
  start?: string;
  end?: string;
  period?: string;
  messageCount: number;
  chunkCount: number;
  processedChunkCount?: number;
  summaryId?: number;
  summary?: WechatSummary;
  error?: string;
  sendStatus?: string;
  sendError?: string;
  createdAt?: string;
  startedAt?: string;
  finishedAt?: string;
};

export type WechatSummary = {
  id?: number;
  summary: string;
  report?: WechatSummaryReport;
  messageCount: number;
  speakerCount?: number;
  maxMessages?: number;
  truncated: boolean;
  start?: string;
  end?: string;
  roomId?: string;
  roomName?: string;
  period?: string;
  model?: string;
  createdBy?: string;
  createdAt?: string;
};

export type WechatSummaryReport = {
  overview: string;
  topics: WechatSummaryTopic[];
  importantInfo: string[];
  memes: string[];
  disputes: string;
  miniPrograms: string[];
  modelComparisons?: Array<{
    model: string;
    overview: string;
    topics: WechatSummaryTopic[];
  }>;
  parseFailed?: boolean;
};

export type WechatSummaryTopic = {
  title: string;
  summary: string;
  start?: string;
  end?: string;
  keywords: string[];
  messageIds: string[];
  messageCount: number;
  speakerCount: number;
  samples: Array<{
    id?: string;
    roomId?: string;
    sender?: string;
    content?: string;
    time?: string;
  }>;
};

export type WechatAiJobType = 'reply' | 'segment_summary' | 'profile_merge' | 'culture_update' | 'persona_candidate' | 'proactive_intervention';

export type WechatAiJob = {
  id: number;
  roomId: string;
  jobType: WechatAiJobType;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  model: string;
  windowStart?: ApiUnixTime;
  windowEnd?: ApiUnixTime;
  sourceMsgId?: string;
  inputMsgCount: number;
  resultJson?: Record<string, unknown>;
  errorId?: number;
  reason?: string;
  createdAt?: ApiUnixTime;
  startedAt?: ApiUnixTime;
  finishedAt?: ApiUnixTime;
};

export type WechatAiError = {
  id: number;
  jobId: number;
  roomId: string;
  jobType: WechatAiJobType;
  model: string;
  errorType: string;
  errorMessage: string;
  inputMsgCount: number;
  elapsedMs: number;
  requestMetaJson?: Record<string, unknown>;
  retryOfErrorId?: number;
  resolved: number | boolean;
  createdAt?: ApiUnixTime;
};

export type WechatAiRoleCard = {
  content: string;
  isDefault?: boolean;
  updatedAt?: ApiUnixTime;
};

export type WechatAiPromptInstructionKey = 'segment_summary' | 'profile_merge' | 'takeover_recruitment';

export type WechatAiPromptInstruction = {
  key: WechatAiPromptInstructionKey;
  content: string;
  updatedAt?: ApiUnixTime;
};

export type WechatAiReplyStyleSample = {
  id: number;
  roomId: string;
  scenario: string;
  triggerText: string;
  replyText: string;
  sourceReplyLogId?: number;
  createdAt?: ApiUnixTime;
  updatedAt?: ApiUnixTime;
};

export type WechatAiReplyConversationSample = {
  id: number;
  roomId: string;
  scenario: string;
  contextText: string;
  replyText: string;
  sourceReplyLogId?: number;
  createdAt?: ApiUnixTime;
  updatedAt?: ApiUnixTime;
};

export type WechatAiReplyLog = {
  id: number;
  roomId: string;
  triggerMsgId: string;
  triggerContent?: string;
  decisionJson: Record<string, unknown>;
  replyText: string;
  feedback?: 'human' | 'too_ai' | 'too_much' | '';
  feedbackAt?: ApiUnixTime;
  createdAt?: ApiUnixTime;
};

export type WechatAiMemoryRun = {
  id: number;
  jobId: number;
  roomId: string;
  windowStart: ApiUnixTime;
  windowEnd: ApiUnixTime;
  windowEndMsgId: string;
  granularity: string;
  inputMsgCount: number;
  resultJson: Record<string, unknown>;
  createdAt?: ApiUnixTime;
};

export type WechatAiProfile = {
  roomId: string;
  memberWxid: string;
  displayName: string;
  profileJson: Record<string, unknown>;
  confidence: number;
  evidenceMsgIds: string[];
  updatedAt?: ApiUnixTime;
};

export type WechatAiPersona = {
  roomId: string;
  roomCultureJson: Record<string, unknown>;
  botPersonaJson: Record<string, unknown>;
  updatedAt?: ApiUnixTime;
};

export type WechatAiPersonaCandidate = {
  id: number;
  roomId: string;
  candidateJson: Record<string, unknown>;
  evidenceRunIds: number[];
  status: 'pending' | 'promoted' | 'rejected';
  createdAt?: ApiUnixTime;
  reviewedAt?: ApiUnixTime;
};

export type WechatAiPersonaVersion = {
  id: number;
  roomId: string;
  versionNo: number;
  roomCultureJson: Record<string, unknown>;
  botPersonaJson: Record<string, unknown>;
  sourceType: string;
  sourceId?: number;
  note?: string;
  createdAt?: ApiUnixTime;
};

export type WechatAiHistoryLearningTask = {
  id: number;
  roomId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'paused' | 'canceled';
  stage: 'segment' | 'profile_merge' | 'culture_update' | 'persona_candidate' | 'done';
  windowStart: ApiUnixTime;
  windowEnd: ApiUnixTime;
  maxMessages: number;
  totalMsgCount: number;
  processedMsgCount: number;
  segmentJobCount: number;
  cursorTime?: ApiUnixTime;
  cursorMsgId?: string;
  currentJobId?: number;
  profileJobId?: number;
  cultureJobId?: number;
  personaJobId?: number;
  errorMessage?: string;
  createdAt?: ApiUnixTime;
  updatedAt?: ApiUnixTime;
  finishedAt?: ApiUnixTime;
};

export type WechatAiPersonaEvidence = {
  candidate: WechatAiPersonaCandidate;
  runs: WechatAiMemoryRun[];
  messages: WechatMessage[];
};

export type WechatAiObservation = {
  days: number;
  roomId?: string;
  jobStats: Array<{ jobType: WechatAiJobType; status: WechatAiJob['status']; count: number; avgInputMsgCount?: number }>;
  memoryStats: { segmentCount?: number; avgQualityScore?: number; lowQualityCount?: number };
  activeLearning: WechatAiHistoryLearningTask[];
  recentErrors: WechatAiError[];
  recentVersions: WechatAiPersonaVersion[];
};

export type WechatAiKnowledgeRecord = {
  id: number;
  roomId: string;
  state: string;
  kind?: 'fact' | 'hypothesis' | 'judgement';
  confidence?: number;
  content?: string;
  summary?: string;
  evidenceMsgIds?: string[];
  leftMemberWxid?: string;
  rightMemberWxid?: string;
  updatedAt?: ApiUnixTime;
};

export type WechatAiIntervention = {
  id: number;
  roomId: string;
  eventType: string;
  state: 'new' | 'addressed' | 'reopened';
  decisionJson?: Record<string, unknown>;
  replyText?: string;
  addressedBy?: string;
  updatedAt?: ApiUnixTime;
};

export type WechatAiMemoryFeedback = {
  id: number;
  roomId: string;
  targetType: 'fact' | 'relationship' | 'event';
  targetId: number;
  stance: 'correct' | 'deny' | 'question';
  feedbackText: string;
  status: 'pending' | 'applied' | 'rejected';
  createdAt?: ApiUnixTime;
};

export type WechatAiProactiveConfig = {
  proactiveEnabled: boolean;
  proactiveObserverIntervalSeconds: number;
  proactiveSettleSeconds: number;
  proactiveTimeoutSeconds: number;
};

export type WechatAiStatus = {
  enabled: boolean;
  configured: boolean;
  running: boolean;
  autoMemoryEnabled: boolean;
  queues: Record<string, number>;
  models: Record<string, string>;
  rooms: Array<{ roomId: string; roomName?: string; lastSegment?: WechatAiMemoryRun; activeJobs: WechatAiJob[] }>;
  recentJobs: WechatAiJob[];
};

export type WechatStatsTotals = {
  messageCount: number;
  participantCount: number;
  groupCount: number;
  messagesPerParticipant: number;
};

export type WechatDailyStat = {
  date: string;
  messageCount: number;
  participantCount: number;
  groupCount: number;
};

export type WechatParticipantStat = {
  senderWxid: string;
  senderName: string;
  messageCount: number;
  activeDays: number;
  groupCount: number;
};

export type WechatDailyStats = {
  range: { start: string; end: string };
  roomId: string;
  totals: WechatStatsTotals;
  daily: WechatDailyStat[];
  participants: WechatParticipantStat[];
};

export type WechatTable = {
  name: string;
  approxRows: number;
  comment?: string;
  engine?: string;
};

export type WechatTableColumn = Record<string, unknown>;

export type WechatTableDetail = {
  table?: string;
  columns: WechatTableColumn[];
};

export type WxbotRemoteConfig = {
  bot?: {
    name?: string;
    admin_wxids?: string[];
    group_whitelist?: string[];
    command_prefix?: string;
    at_me_required?: boolean;
  };
  monitor?: {
    message?: boolean;
    message_types?: string[];
    alert_member_change?: boolean;
    group_cache_ttl?: number;
  };
  welcome?: {
    enabled?: boolean;
    default_msg?: string;
  };
  summary_reminder?: {
    enabled?: boolean;
    jobs?: Array<{ room_id: string; time: string }>;
  };
  ai?: {
    enabled?: boolean;
    group_whitelist?: string[];
    mention_aliases?: string[];
    auto_memory_enabled?: boolean;
    reply_enabled?: boolean;
    takeover_recruitment_enabled?: boolean;
    provider?: 'gpt' | 'doubao';
    gpt_api_base_url?: string;
    gpt_api_key?: string;
    doubao_api_key?: string;
    api_base_url?: string;
    api_key?: string;
    reply_model?: string;
    summary_model?: string;
    merge_model?: string;
    manual_deep_model?: string;
    scan_interval_seconds?: number;
    segment_min_messages?: number;
    segment_quiet_seconds?: number;
    segment_stale_seconds?: number;
    profile_min_segments?: number;
    max_segment_messages?: number;
    reply_context_messages?: number;
    worker_queue_size?: number;
    reply_timeout_seconds?: number;
    summary_timeout_seconds?: number;
    merge_timeout_seconds?: number;
  };
  hook?: Record<string, unknown>;
  webhook?: Record<string, unknown>;
  database?: Record<string, unknown>;
  logging?: Record<string, unknown>;
  party_site?: Record<string, unknown>;
  wxbot_control?: Record<string, unknown>;
  oss?: Record<string, unknown>;
};

export const WXBOT_CONFIG_SCHEMA_VERSION = 1;

export type WxbotConfigEnvelope = {
  schemaVersion?: number;
  config?: WxbotRemoteConfig;
};

export type WxbotConfigPayload = WxbotRemoteConfig | WxbotConfigEnvelope;

export type WxbotRecord = {
  botId: string;
  name: string;
  wxid: string;
  status: string;
  version: string;
  host: string;
  pid: number;
  online: boolean;
  startedAt?: string;
  lastSeenAt?: string;
  configSchemaVersion?: number;
  lastConfigError?: string;
  config: WxbotConfigPayload;
  currentConfig?: WxbotConfigPayload;
  configUpdatedAt?: string;
  configAppliedAt?: string;
  updatedAt?: string;
};

export type WxbotConfigDetail = {
  botId: string;
  config: WxbotConfigPayload;
  currentConfig?: WxbotConfigPayload;
  configSchemaVersion?: number;
  lastConfigError?: string;
  configUpdatedAt?: string;
};

const root = '/admin/wechat-bot';
const aiRoot = `${root}/ai`;

export const listWechatGroups = () => unwrap<WechatGroup[]>(http.get(`${root}/groups`));

export const listWechatMessages = (params: WechatMessageQuery) =>
  unwrap<WechatPage<WechatMessage>>(http.get(`${root}/messages`, { params }));

export const createWechatSummary = (body: WechatSummaryRequest) =>
  unwrap<WechatSummary>(http.post(`${root}/messages/summary`, body, { timeout: 140000 }));

export const createWechatSummaryJob = (body: WechatSummaryRequest) =>
  unwrap<WechatSummaryJob>(http.post(`${root}/messages/summary-jobs`, body));

export const getWechatSummaryJob = (id: number) =>
  unwrap<WechatSummaryJob>(http.get(`${root}/messages/summary-jobs/${id}`));

export const listWechatSummaryHistory = (params: { roomId?: string; start?: string; end?: string; page: number; pageSize: number }) =>
  unwrap<WechatPage<WechatSummary>>(http.get(`${root}/messages/summary/history`, { params }));

export const getWechatSummary = (id: number) =>
  unwrap<WechatSummary>(http.get(`${root}/messages/summary/${id}`));

export const listWechatSummaryMessages = (id: number, params: { topicIndex?: number }) =>
  unwrap<{ data: WechatMessage[] }>(http.get(`${root}/messages/summary/${id}/messages`, { params }));

export const getWechatAiStatus = () => unwrap<WechatAiStatus>(http.get(`${aiRoot}/status`));

export const getWechatAiObservation = (params?: { roomId?: string; days?: number }) =>
  unwrap<WechatAiObservation>(http.get(`${aiRoot}/observation`, { params }));

export const listWechatAiFacts = (params: { roomId: string; state?: string }) =>
  unwrap<{ items: WechatAiKnowledgeRecord[] }>(http.get(`${aiRoot}/memory/facts`, { params }));

export const listWechatAiRelationships = (params: { roomId: string; state?: string }) =>
  unwrap<{ items: WechatAiKnowledgeRecord[] }>(http.get(`${aiRoot}/memory/relationships`, { params }));

export const listWechatAiEvents = (params: { roomId: string; state?: string }) =>
  unwrap<{ items: WechatAiKnowledgeRecord[] }>(http.get(`${aiRoot}/memory/events`, { params }));

export const listWechatAiInterventions = (params?: { roomId?: string; state?: string }) =>
  unwrap<{ items: WechatAiIntervention[] }>(http.get(`${aiRoot}/interventions`, { params }));

export const listWechatAiMemoryFeedbacks = (params?: { roomId?: string; status?: string }) =>
  unwrap<{ items: WechatAiMemoryFeedback[] }>(http.get(`${aiRoot}/memory/feedbacks`, { params }));

export const getWechatAiProactiveConfig = () =>
  unwrap<WechatAiProactiveConfig>(http.get(`${aiRoot}/config`));

export const updateWechatAiProactiveConfig = (config: WechatAiProactiveConfig) =>
  unwrap<WechatAiProactiveConfig>(http.put(`${aiRoot}/config`, {
    proactive_enabled: config.proactiveEnabled,
    proactive_observer_interval_seconds: config.proactiveObserverIntervalSeconds,
    proactive_settle_seconds: config.proactiveSettleSeconds,
    proactive_timeout_seconds: config.proactiveTimeoutSeconds,
  }));

export const getWechatAiRoleCard = () => unwrap<WechatAiRoleCard>(http.get(`${aiRoot}/role-card`));

export const updateWechatAiRoleCard = (content: string) =>
  unwrap<WechatAiRoleCard>(http.put(`${aiRoot}/role-card`, { content }));

export const listWechatAiPromptInstructions = () =>
  unwrap<{ items: WechatAiPromptInstruction[] }>(http.get(`${aiRoot}/prompt-instructions`));

export const updateWechatAiPromptInstruction = (key: WechatAiPromptInstructionKey, content: string) =>
  unwrap<WechatAiPromptInstruction>(http.put(`${aiRoot}/prompt-instructions`, { key, content }));

export const listWechatAiReplyStyleSamples = (params?: { roomId?: string; limit?: number }) =>
  unwrap<{ items: WechatAiReplyStyleSample[] }>(http.get(`${aiRoot}/reply-samples`, { params }));

export const createWechatAiReplyStyleSample = (body: { roomId?: string; scenario?: string; triggerText: string; replyText: string }) =>
  unwrap<WechatAiReplyStyleSample>(http.post(`${aiRoot}/reply-samples`, body));

export const deleteWechatAiReplyStyleSample = (id: number) =>
  unwrap<{ deleted: boolean }>(http.delete(`${aiRoot}/reply-samples/${id}`));

export const listWechatAiReplyConversationSamples = (params?: { roomId?: string; limit?: number }) =>
  unwrap<{ items: WechatAiReplyConversationSample[] }>(http.get(`${aiRoot}/reply-conversation-samples`, { params }));

export const createWechatAiReplyConversationSample = (body: { roomId?: string; scenario?: string; contextText: string; replyText: string }) =>
  unwrap<WechatAiReplyConversationSample>(http.post(`${aiRoot}/reply-conversation-samples`, body));

export const deleteWechatAiReplyConversationSample = (id: number) =>
  unwrap<{ deleted: boolean }>(http.delete(`${aiRoot}/reply-conversation-samples/${id}`));

export const listWechatAiReplyLogs = (params?: { roomId?: string; limit?: number }) =>
  unwrap<{ items: WechatAiReplyLog[] }>(http.get(`${aiRoot}/reply-logs`, { params }));

export const reviewWechatAiReplyLog = (id: number, feedback: Exclude<WechatAiReplyLog['feedback'], ''>) =>
  unwrap<{ feedback: string; sampleActive: boolean }>(http.post(`${aiRoot}/reply-logs/${id}/feedback`, { feedback }));

export const listWechatAiJobs = (params?: { roomId?: string; status?: string; limit?: number }) =>
  unwrap<{ items: WechatAiJob[] }>(http.get(`${aiRoot}/jobs`, { params }));

export const createWechatAiJob = (body: { roomId: string; jobType: Exclude<WechatAiJobType, 'reply'>; start?: string; end?: string; reason?: string; model?: string }) =>
  unwrap<WechatAiJob>(http.post(`${aiRoot}/jobs`, body));

export const getWechatAiJob = (id: number) => unwrap<WechatAiJob>(http.get(`${aiRoot}/jobs/${id}`));

export const listWechatAiHistoryLearningTasks = (params?: { roomId?: string; limit?: number }) =>
  unwrap<{ items: WechatAiHistoryLearningTask[] }>(http.get(`${aiRoot}/history-learning`, { params }));

export const createWechatAiHistoryLearningTask = (body: { roomId: string; start?: string; end?: string; maxMessages?: number }) =>
  unwrap<WechatAiHistoryLearningTask>(http.post(`${aiRoot}/history-learning`, body));

export const updateWechatAiHistoryLearningTask = (id: number, action: 'pause' | 'resume' | 'cancel' | 'retry') =>
  unwrap<WechatAiHistoryLearningTask>(http.post(`${aiRoot}/history-learning/${id}/${action}`));

export const listWechatAiErrors = (params?: { roomId?: string; unresolvedOnly?: boolean; limit?: number }) =>
  unwrap<{ items: WechatAiError[] }>(http.get(`${aiRoot}/errors`, { params }));

export const retryWechatAiError = (id: number) => unwrap<WechatAiJob>(http.post(`${aiRoot}/errors/${id}/retry`));

export const resolveWechatAiError = (id: number) => unwrap<{ resolved: boolean }>(http.post(`${aiRoot}/errors/${id}/resolve`));

export const listWechatAiMemoryRuns = (params?: { roomId?: string; limit?: number }) =>
  unwrap<{ items: WechatAiMemoryRun[] }>(http.get(`${aiRoot}/memory/runs`, { params }));

export const getWechatAiRoomPersona = (roomId?: string) =>
  unwrap<WechatAiPersona | { items: Array<{ roomId: string; persona: WechatAiPersona }> }>(http.get(`${aiRoot}/memory/room-persona`, { params: roomId ? { roomId } : undefined }));

export const listWechatAiProfiles = (roomId: string) =>
  unwrap<{ items: WechatAiProfile[] }>(http.get(`${aiRoot}/memory/member-profiles`, { params: { roomId } }));

export const listWechatAiPersonaCandidates = (params?: { roomId?: string; limit?: number }) =>
  unwrap<{ items: WechatAiPersonaCandidate[] }>(http.get(`${aiRoot}/memory/persona-candidates`, { params }));

export const getWechatAiPersonaCandidateEvidence = (id: number) =>
  unwrap<WechatAiPersonaEvidence>(http.get(`${aiRoot}/memory/persona-candidates/${id}/evidence`));

export const listWechatAiPersonaVersions = (params?: { roomId?: string; limit?: number }) =>
  unwrap<{ items: WechatAiPersonaVersion[] }>(http.get(`${aiRoot}/memory/persona-versions`, { params }));

export const rollbackWechatAiPersonaVersion = (id: number) =>
  unwrap<{ persona: WechatAiPersona; rolledBackFrom: WechatAiPersonaVersion }>(http.post(`${aiRoot}/memory/persona-versions/${id}/rollback`));

export const promoteWechatAiPersonaCandidate = (id: number) =>
  unwrap<WechatAiPersonaCandidate>(http.post(`${aiRoot}/memory/persona-candidates/${id}/promote`));

export const rejectWechatAiPersonaCandidate = (id: number) =>
  unwrap<WechatAiPersonaCandidate>(http.post(`${aiRoot}/memory/persona-candidates/${id}/reject`));

export const getWechatDailyStats = (params: { start: string; end: string; roomId?: string }) =>
  unwrap<WechatDailyStats>(http.get(`${root}/stats/daily`, { params }));

export const listWechatTables = () => unwrap<WechatTable[]>(http.get(`${root}/tables`));

export const getWechatTable = (table: string) =>
  unwrap<WechatTableDetail>(http.get(`${root}/tables/${encodeURIComponent(table)}`));

export const listWechatTableRows = (table: string, params: { page: number; pageSize: number }) =>
  unwrap<WechatPage<Record<string, unknown>>>(
    http.get(`${root}/tables/${encodeURIComponent(table)}/rows`, { params }),
  );

export const listWxbots = () => unwrap<{ list: WxbotRecord[] }>(http.get(`${root}/wxbots`));

export const getWxbotConfig = (botId: string) =>
  unwrap<WxbotConfigDetail>(http.get(`${root}/wxbots/${encodeURIComponent(botId)}/config`));

export const updateWxbotConfig = (botId: string, config: WxbotRemoteConfig) =>
  unwrap<WxbotConfigDetail>(http.put(`${root}/wxbots/${encodeURIComponent(botId)}/config`, {
    config: { schemaVersion: WXBOT_CONFIG_SCHEMA_VERSION, config },
  }));
