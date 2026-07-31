export type WechatSummaryDailySchedule = {
  enabled?: boolean;
  time?: string;
  dateMode?: 'today' | 'yesterday';
  period?: 'day' | 'morning' | 'afternoon' | 'evening';
  roomId?: string;
  name?: string;
};

export type AIProvider = 'gpt' | 'doubao';

export const DOUBAO_API_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

export const aiProviderOptions = [
  { label: 'GPT', value: 'gpt' },
  { label: '豆包', value: 'doubao' },
];

export const aiModelOptionsByProvider: Record<AIProvider, Array<{ label: string; value: string }>> = {
  gpt: [
    { label: 'GPT-5.4 Mini', value: 'gpt-5.4-mini' },
    { label: 'GPT-5.5', value: 'gpt-5.5' },
    { label: 'GPT-5.2', value: 'gpt-5.2' },
  ],
  doubao: [
    { label: '豆包 Seed 2.0 Mini', value: 'doubao-seed-2-0-mini-260428' },
    { label: '豆包 Seed 2.1 Turbo', value: 'doubao-seed-2-1-turbo-260628' },
    { label: '豆包 Seed 2.1 Pro', value: 'doubao-seed-2-1-pro-260628' },
  ],
};

export const aiModelDefaults: Record<AIProvider, string> = {
  gpt: 'gpt-5.4-mini',
  doubao: 'doubao-seed-2-0-mini-260428',
};

export function normalizeAIProvider(value: unknown): AIProvider {
  const provider = String(value || '').trim().toLowerCase();
  return provider === 'doubao' || provider === '豆包' ? 'doubao' : 'gpt';
}

export function isDoubaoAPIBaseURL(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions$/, '')
    .toLowerCase() === DOUBAO_API_BASE_URL;
}

export function isAIModel(provider: AIProvider, value: unknown) {
  const model = String(value || '').trim();
  return aiModelOptionsByProvider[provider].some((item) => item.value === model);
}

export function normalizeAIModel(provider: AIProvider, value: unknown) {
  const model = String(value || '').trim();
  return isAIModel(provider, model) ? model : aiModelDefaults[provider];
}

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
  aiExtractProvider?: AIProvider;
  aiExtractGptBaseUrl?: string;
  aiExtractGptApiKey?: string;
  aiExtractDoubaoApiKey?: string;
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

export type NormalizedSettingsValues = Omit<SettingsValues, 'aiExtractApiKey' | 'aiExtractBaseUrl'>;

export const sensitiveSettingsKeys: Array<keyof NormalizedSettingsValues> = [
  'uapiKey',
  'steamWebApiKey',
  'kookBotToken',
  'kookVerifyToken',
  'kookEncryptKey',
  'aiExtractGptApiKey',
  'aiExtractDoubaoApiKey',
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
  { enabled: true, time: '12:00', dateMode: 'today', period: 'morning', name: '上午总结' },
  { enabled: true, time: '18:00', dateMode: 'today', period: 'afternoon', name: '下午总结' },
  { enabled: true, time: '23:00', dateMode: 'today', period: 'evening', name: '晚上总结' },
];

function normalizeDailySchedules(values?: WechatSummaryDailySchedule[]): WechatSummaryDailySchedule[] {
  const items = Array.isArray(values) ? values : [];
  const schedules = items
    .map((item) => {
      const period = ['day', 'morning', 'afternoon', 'evening'].includes(String(item.period)) ? item.period : 'day';
      const dateMode: WechatSummaryDailySchedule['dateMode'] = item.dateMode === 'yesterday' ? 'yesterday' : 'today';
      return {
        enabled: Boolean(item.enabled),
        time: normalizeDailyTime(item.time),
        dateMode,
        period: period as 'day' | 'morning' | 'afternoon' | 'evening',
        roomId: item.roomId?.trim() || '',
        name: item.name?.trim() || '',
      };
    })
    .filter((item) => item.time);
  return schedules.length ? schedules : defaultWechatSummaryDailySchedules;
}

export function normalizeSettings(values: SettingsValues): NormalizedSettingsValues {
  const expirationDays = Number(values.dailyTakeoverExpirationDays);
  const summaryMaxMessages = Number(values.wechatSummaryMaxMessages);
  const legacyBaseURL = values.aiExtractBaseUrl?.trim().replace(/\/+$/, '') || '';
  const legacyAPIKey = values.aiExtractApiKey?.trim() || '';
  const provider = normalizeAIProvider(values.aiExtractProvider || (isDoubaoAPIBaseURL(legacyBaseURL) ? 'doubao' : 'gpt'));
  const gptBaseURL = values.aiExtractGptBaseUrl?.trim().replace(/\/+$/, '') || (provider === 'gpt' ? legacyBaseURL : '');
  const gptAPIKey = values.aiExtractGptApiKey?.trim() || (provider === 'gpt' ? legacyAPIKey : '');
  const doubaoAPIKey = values.aiExtractDoubaoApiKey?.trim() || (provider === 'doubao' ? legacyAPIKey : '');
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
    aiExtractProvider: provider,
    aiExtractGptBaseUrl: gptBaseURL,
    aiExtractGptApiKey: gptAPIKey,
    aiExtractDoubaoApiKey: doubaoAPIKey,
    aiExtractModel: normalizeAIModel(provider, values.aiExtractModel),
    wechatSummaryMaxMessages: Number.isInteger(summaryMaxMessages)
      && summaryMaxMessages >= 1
      && summaryMaxMessages <= 10000
      ? summaryMaxMessages
      : 1000,
    wechatSummaryPrompt: values.wechatSummaryPrompt?.trim() || '',
    wechatSummaryStyle: normalizeSummaryStyle(values.wechatSummaryStyle),
    wechatSummaryModel: values.wechatSummaryModel?.trim()
      ? normalizeAIModel(provider, values.wechatSummaryModel)
      : '',
    wechatSummaryCompareModels: normalizeCSV(values.wechatSummaryCompareModels),
    wechatSummaryAutoSend: Boolean(values.wechatSummaryAutoSend),
    wechatSummaryAutoDaily: Boolean(values.wechatSummaryAutoDaily),
    wechatSummaryDailySchedules: normalizeDailySchedules(values.wechatSummaryDailySchedules),
  };
}
