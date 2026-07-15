export type WechatSummaryDailySchedule = {
  enabled?: boolean;
  time?: string;
  period?: 'day' | 'morning' | 'afternoon' | 'evening';
  roomId?: string;
  name?: string;
};

export type SettingsValues = {
  publishTakeoverEnabled?: boolean;
  dailyTakeoverExpirationDays?: number;
  uapiKey?: string;
  steamWebApiKey?: string;
  kookBotToken?: string;
  kookGuildId?: string;
  kookVerifyToken?: string;
  kookEncryptKey?: string;
  aiExtractEnabled?: boolean;
  aiExtractApiKey?: string;
  aiExtractBaseUrl?: string;
  aiExtractModel?: string;
  wechatSummaryMaxMessages?: number;
  wechatSummaryPrompt?: string;
  wechatSummaryStyle?: string;
  wechatSummaryModel?: string;
  wechatSummaryCompareModels?: string;
  wechatSummaryAutoSend?: boolean;
  wechatSummaryAutoDaily?: boolean;
  wechatSummaryDailySchedules?: WechatSummaryDailySchedule[];
};

export const sensitiveSettingsKeys: Array<keyof SettingsValues> = [
  'uapiKey',
  'steamWebApiKey',
  'kookBotToken',
  'kookVerifyToken',
  'kookEncryptKey',
  'aiExtractApiKey',
];

function normalizeCSV(value?: string) {
  const items = String(value || '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(items)).join(',');
}

function normalizeSummaryStyle(value?: string) {
  const style = String(value || '').trim();
  return ['brief', 'detailed', 'fun'].includes(style) ? style : '';
}

function normalizeDailyTime(value?: string) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{2}):(\d{2})$/);
  if (!match) return '09:00';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 ? text : '09:00';
}

const defaultWechatSummaryDailySchedules: WechatSummaryDailySchedule[] = [
  { enabled: true, time: '12:00', period: 'morning', name: '上午总结' },
  { enabled: true, time: '18:00', period: 'afternoon', name: '下午总结' },
  { enabled: true, time: '23:00', period: 'evening', name: '晚上总结' },
];

function normalizeDailySchedules(values?: WechatSummaryDailySchedule[]) {
  const items = Array.isArray(values) ? values : [];
  const schedules = items
    .map((item) => {
      const period = ['day', 'morning', 'afternoon', 'evening'].includes(String(item.period)) ? item.period : 'day';
      return {
        enabled: Boolean(item.enabled),
        time: normalizeDailyTime(item.time),
        period: period as 'day' | 'morning' | 'afternoon' | 'evening',
        roomId: item.roomId?.trim() || '',
        name: item.name?.trim() || '',
      };
    })
    .filter((item) => item.time);
  return schedules.length ? schedules : defaultWechatSummaryDailySchedules;
}

export function normalizeSettings(values: SettingsValues) {
  const expirationDays = Number(values.dailyTakeoverExpirationDays);
  const summaryMaxMessages = Number(values.wechatSummaryMaxMessages);
  return {
    publishTakeoverEnabled: Boolean(values.publishTakeoverEnabled),
    dailyTakeoverExpirationDays: Number.isInteger(expirationDays)
      && expirationDays >= 1
      && expirationDays <= 365
      ? expirationDays
      : 10,
    uapiKey: values.uapiKey?.trim() || '',
    steamWebApiKey: values.steamWebApiKey?.trim() || '',
    kookBotToken: values.kookBotToken?.trim() || '',
    kookGuildId: values.kookGuildId?.trim() || '',
    kookVerifyToken: values.kookVerifyToken?.trim() || '',
    kookEncryptKey: values.kookEncryptKey?.trim() || '',
    aiExtractEnabled: Boolean(values.aiExtractEnabled),
    aiExtractApiKey: values.aiExtractApiKey?.trim() || '',
    aiExtractBaseUrl: values.aiExtractBaseUrl?.trim().replace(/\/+$/, '') || '',
    aiExtractModel: values.aiExtractModel?.trim() || '',
    wechatSummaryMaxMessages: Number.isInteger(summaryMaxMessages)
      && summaryMaxMessages >= 1
      && summaryMaxMessages <= 10000
      ? summaryMaxMessages
      : 1000,
    wechatSummaryPrompt: values.wechatSummaryPrompt?.trim() || '',
    wechatSummaryStyle: normalizeSummaryStyle(values.wechatSummaryStyle),
    wechatSummaryModel: values.wechatSummaryModel?.trim() || '',
    wechatSummaryCompareModels: normalizeCSV(values.wechatSummaryCompareModels),
    wechatSummaryAutoSend: Boolean(values.wechatSummaryAutoSend),
    wechatSummaryAutoDaily: Boolean(values.wechatSummaryAutoDaily),
    wechatSummaryDailySchedules: normalizeDailySchedules(values.wechatSummaryDailySchedules),
  };
}
