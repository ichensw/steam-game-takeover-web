export type SummaryPeriod = 'day' | 'morning' | 'afternoon' | 'custom';

export type ApiUnixTime = {
  unix: number;
  text: string;
};

export const wechatMessageTypes = [
  { value: 1, label: '文本' },
  { value: 3, label: '图片' },
  { value: 34, label: '语音' },
  { value: 43, label: '视频' },
  { value: 47, label: '表情' },
  { value: 49, label: '卡片 / 文件' },
  { value: 10002, label: '拍一拍' },
];

export type SummaryFormValues = {
  roomId?: string;
  date?: string;
  period?: SummaryPeriod;
  start?: string;
  end?: string;
};

export type SummaryPayload = {
  period: string;
  roomId?: string;
  date?: string;
  start?: string;
  end?: string;
};

export function buildQuery(values: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  return params.toString();
}

export function toApiTime(value?: string) {
  if (!value) return '';
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) return `${text}:00`;
  return text;
}

export function summaryPayload(values: SummaryFormValues): SummaryPayload {
  const period = values.period || 'day';
  const payload: SummaryPayload = { period };
  if (values.roomId) payload.roomId = values.roomId;
  if (period === 'custom') {
    payload.start = toApiTime(values.start);
    payload.end = toApiTime(values.end);
    return payload;
  }
  if (values.date) payload.date = values.date;
  return payload;
}

export function todayString(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function lastNDaysRange(days: number, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - Math.max(1, days) + 1);
  return { start: todayString(start), end: todayString(end) };
}

export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    const text = (value as { text?: unknown }).text;
    return typeof text === 'string' ? text : JSON.stringify(value);
  }
  return String(value);
}

export function formatWechatTime(value: ApiUnixTime | string | null | undefined): string {
  const text = formatCell(value).trim();
  return text || '-';
}

export function wechatMessageTypeLabel(value: number): string {
  return wechatMessageTypes.find((item) => item.value === value)?.label || `类型 ${value}`;
}

export function previewText(value: unknown, maxLength = 420) {
  const text = formatCell(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
