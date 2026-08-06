import { http, unwrap } from './http';
import type { ApiUnixTime } from '../utils/wechatBot';

export type WechatGroup = {
  roomId: string;
  roomName: string;
  memberCount: number;
  ownerWxid: string;
  updatedAt: ApiUnixTime;
};

export type WechatManagedGroup = WechatGroup & {
  messageCount: number;
  activeMembers: number;
  lastMessageAt?: ApiUnixTime;
  botWhitelisted: boolean;
  aiWhitelisted: boolean;
};

export type WechatManagedGroupPage = {
  botId: string;
  items: WechatManagedGroup[];
  pagination?: Pagination;
};

export type WechatGroupMember = {
  memberWxid: string;
  displayName: string;
  messageCount: number;
  firstMessageAt: ApiUnixTime;
  lastMessageAt: ApiUnixTime;
};

export type WechatGroupMemberEvent = {
  id: number;
  roomId: string;
  roomName: string;
  action: 'join' | 'leave';
  memberWxid: string;
  memberName: string;
  memberCount?: number;
  rawPayload?: string;
  createdAt: ApiUnixTime;
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

export type WechatAiJobType = 'reply' | 'vector_sync' | 'vector_backfill';

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

export type WechatAiPromptInstructionKey = string;

export type WechatAiPromptInstruction = {
  key: WechatAiPromptInstructionKey;
  label?: string;
  placeholders?: string[];
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

export type WechatAiHistoryLearningTask = {
  id: number;
  roomId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'paused' | 'canceled';
  stage: 'vector_backfill' | 'done';
  windowStart: ApiUnixTime;
  windowEnd: ApiUnixTime;
  maxMessages: number;
  totalMsgCount: number;
  processedMsgCount: number;
  currentJobId?: number;
  errorMessage?: string;
  createdAt?: ApiUnixTime;
  updatedAt?: ApiUnixTime;
  finishedAt?: ApiUnixTime;
};

export type WechatAiStatus = {
  enabled: boolean;
  configured: boolean;
  running: boolean;
  queues: Record<string, number>;
  models: Record<string, string>;
  vector?: {
    enabled: boolean;
    configured: boolean;
    reason?: string;
    embeddingModel: string;
    syncStates: Array<{
      roomId: string;
      cursorTime?: ApiUnixTime;
      cursorMsgId?: string;
      lastSuccessAt?: ApiUnixTime;
      lastError?: string;
      updatedAt?: ApiUnixTime;
    }>;
  };
  rooms: Array<{ roomId: string; roomName?: string; activeJobs: WechatAiJob[] }>;
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
    reply_enabled?: boolean;
    private_reply_enabled?: boolean;
    provider?: 'gpt' | 'doubao';
    gpt_api_base_url?: string;
    gpt_api_key?: string;
    doubao_api_key?: string;
    api_base_url?: string;
    api_key?: string;
    reply_model?: string;
    reply_temperature?: number;
    reply_context_messages?: number;
    reply_input_token_budget?: number;
    worker_queue_size?: number;
    reply_timeout_seconds?: number;
    vector_enabled?: boolean;
    vector_qdrant_url?: string;
    vector_qdrant_api_key?: string;
    vector_embedding_base_url?: string;
    vector_embedding_api_key?: string;
    vector_embedding_model?: string;
    vector_sync_interval_seconds?: number;
    vector_sync_batch_size?: number;
    vector_search_limit?: number;
    vector_min_score?: number;
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

export const listWechatManagedGroups = (params?: { botId?: string; page?: number; pageSize?: number }) =>
  unwrap<WechatManagedGroupPage>(http.get(`${root}/groups/manage`, { params }));

export const listWechatGroupMembers = (roomId: string, params: { page: number; pageSize: number; fast?: 1 }) =>
  unwrap<WechatPage<WechatGroupMember>>(http.get(`${root}/groups/manage/${encodeURIComponent(roomId)}/members`, { params }));

export const listWechatGroupMemberEvents = (roomId: string, params: { page: number; pageSize: number; fast?: 1 }) =>
  unwrap<WechatPage<WechatGroupMemberEvent>>(http.get(`${root}/groups/manage/${encodeURIComponent(roomId)}/events`, { params }));

export const updateWechatGroupWhitelist = (roomId: string, body: { botId: string; type: 'bot' | 'ai'; enabled: boolean }) =>
  unwrap<{ botId: string; roomId: string; type: 'bot' | 'ai'; enabled: boolean }>(
    http.put(`${root}/groups/manage/${encodeURIComponent(roomId)}/whitelist`, body),
  );

export const listWechatMessages = (params: WechatMessageQuery) =>
  unwrap<WechatPage<WechatMessage>>(http.get(`${root}/messages`, { params }));

export const getWechatAiStatus = () => unwrap<WechatAiStatus>(http.get(`${aiRoot}/status`));

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

export const createWechatAiJob = (body: { roomId: string; jobType: 'vector_backfill'; start?: string; end?: string; reason?: string; model?: string }) =>
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
