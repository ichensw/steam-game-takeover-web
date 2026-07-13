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
};

export const sensitiveSettingsKeys: Array<keyof SettingsValues> = [
  'uapiKey',
  'steamWebApiKey',
  'kookBotToken',
  'kookVerifyToken',
  'kookEncryptKey',
  'aiExtractApiKey',
];

export function normalizeSettings(values: SettingsValues) {
  const expirationDays = Number(values.dailyTakeoverExpirationDays);
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
  };
}
