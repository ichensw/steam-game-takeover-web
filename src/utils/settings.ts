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

export function normalizeSettings(values: SettingsValues): NormalizedSettingsValues {
  const expirationDays = Number(values.dailyTakeoverExpirationDays);
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
  };
}
