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

export type WechatAiJobType = 'reply' | 'segment_summary' | 'profile_merge' | 'culture_update' | 'persona_candidate';

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

export type WechatAiStatus = {
  enabled: boolean;
  configured: boolean;
  running: boolean;
  autoMemoryEnabled: boolean;
  queues: Record<string, number>;
  models: Record<string, string>;
  rooms: Array<{ roomId: string; lastSegment?: WechatAiMemoryRun; activeJobs: WechatAiJob[] }>;
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
    auto_memory_enabled?: boolean;
    reply_enabled?: boolean;
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
  config: WxbotRemoteConfig;
  currentConfig?: WxbotRemoteConfig;
  configUpdatedAt?: string;
  configAppliedAt?: string;
  updatedAt?: string;
};

export type WxbotConfigDetail = {
  botId: string;
  config: WxbotRemoteConfig;
  currentConfig?: WxbotRemoteConfig;
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

export const listWechatAiJobs = (params?: { roomId?: string; status?: string; limit?: number }) =>
  unwrap<{ items: WechatAiJob[] }>(http.get(`${aiRoot}/jobs`, { params }));

export const createWechatAiJob = (body: { roomId: string; jobType: Exclude<WechatAiJobType, 'reply'>; start?: string; end?: string; reason?: string; model?: string }) =>
  unwrap<WechatAiJob>(http.post(`${aiRoot}/jobs`, body));

export const getWechatAiJob = (id: number) => unwrap<WechatAiJob>(http.get(`${aiRoot}/jobs/${id}`));

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
  unwrap<WxbotConfigDetail>(http.put(`${root}/wxbots/${encodeURIComponent(botId)}/config`, { config }));
