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
