export const settingsSectionKeys = ['takeover', 'steam', 'kook', 'ai'] as const;

export type SettingsSectionKey = (typeof settingsSectionKeys)[number];

export const settingsSections: Array<{
  key: SettingsSectionKey;
  label: string;
  description: string;
}> = [
  { key: 'takeover', label: '接龙设置', description: '发布开关与每日接龙结束规则' },
  { key: 'steam', label: 'Steam', description: 'SteamID 校验所需密钥' },
  { key: 'kook', label: 'KOOK', description: '机器人、Webhook 与接入状态' },
  { key: 'ai', label: 'AI', description: '汇总词提取、微信总结与历史刷新' },
];

export function isSettingsSectionKey(value: string): value is SettingsSectionKey {
  return settingsSectionKeys.includes(value as SettingsSectionKey);
}
