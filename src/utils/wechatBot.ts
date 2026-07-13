export type SummaryPeriod = 'day' | 'morning' | 'afternoon' | 'custom';

export type SummaryFormValues = {
  roomId?: string;
  date?: string;
  period?: SummaryPeriod;
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

export function summaryPayload(values: SummaryFormValues) {
  const period = values.period || 'day';
  const payload: Record<string, string> = { period };
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

export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    const text = (value as { text?: unknown }).text;
    return typeof text === 'string' ? text : JSON.stringify(value);
  }
  return String(value);
}

export function previewText(value: unknown, maxLength = 420) {
  const text = formatCell(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
