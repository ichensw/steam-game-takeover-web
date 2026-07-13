import { describe, expect, it } from 'vitest';
import { isSettingsSectionKey, settingsSections } from './settingsSections';

describe('settings sections', () => {
  it('exposes every visible settings category in display order', () => {
    expect(settingsSections.map((section) => section.key)).toEqual([
      'takeover',
      'steam',
      'kook',
      'ai',
    ]);
  });

  it('accepts only supported category keys', () => {
    expect(isSettingsSectionKey('kook')).toBe(true);
    expect(isSettingsSectionKey('unknown')).toBe(false);
  });
});
