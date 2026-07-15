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

export type WechatSummary = {
  id?: number;
  summary: string;
  report?: WechatSummaryReport;
  messageCount: number;
  speakerCount?: number;
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

const root = '/admin/wechat-bot';

export const listWechatGroups = () => unwrap<WechatGroup[]>(http.get(`${root}/groups`));

export const listWechatMessages = (params: WechatMessageQuery) =>
  unwrap<WechatPage<WechatMessage>>(http.get(`${root}/messages`, { params }));

export const createWechatSummary = (body: WechatSummaryRequest) =>
  unwrap<WechatSummary>(http.post(`${root}/messages/summary`, body));

export const listWechatSummaryHistory = (params: { roomId?: string; page: number; pageSize: number }) =>
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
