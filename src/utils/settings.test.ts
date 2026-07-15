import { describe, expect, it } from 'vitest';
import { normalizeSettings } from './settings';

describe('admin settings normalization', () => {
  it('defaults invalid daily takeover expiration values to ten days', () => {
    expect(normalizeSettings({}).dailyTakeoverExpirationDays).toBe(10);
    expect(normalizeSettings({ dailyTakeoverExpirationDays: 0 }).dailyTakeoverExpirationDays).toBe(10);
    expect(normalizeSettings({ dailyTakeoverExpirationDays: 366 }).dailyTakeoverExpirationDays).toBe(10);
    expect(normalizeSettings({ dailyTakeoverExpirationDays: 10.5 }).dailyTakeoverExpirationDays).toBe(10);
  });

  it('keeps valid integer daily takeover expiration values', () => {
    expect(normalizeSettings({ dailyTakeoverExpirationDays: 1 }).dailyTakeoverExpirationDays).toBe(1);
    expect(normalizeSettings({ dailyTakeoverExpirationDays: 30 }).dailyTakeoverExpirationDays).toBe(30);
    expect(normalizeSettings({ dailyTakeoverExpirationDays: 365 }).dailyTakeoverExpirationDays).toBe(365);
  });

  it('defaults invalid wechat summary limits to one thousand messages', () => {
    expect(normalizeSettings({}).wechatSummaryMaxMessages).toBe(1000);
    expect(normalizeSettings({ wechatSummaryMaxMessages: 0 }).wechatSummaryMaxMessages).toBe(1000);
    expect(normalizeSettings({ wechatSummaryMaxMessages: 10001 }).wechatSummaryMaxMessages).toBe(1000);
    expect(normalizeSettings({ wechatSummaryMaxMessages: 10.5 }).wechatSummaryMaxMessages).toBe(1000);
  });

  it('keeps valid integer wechat summary limits', () => {
    expect(normalizeSettings({ wechatSummaryMaxMessages: 1 }).wechatSummaryMaxMessages).toBe(1);
    expect(normalizeSettings({ wechatSummaryMaxMessages: 3000 }).wechatSummaryMaxMessages).toBe(3000);
    expect(normalizeSettings({ wechatSummaryMaxMessages: 10000 }).wechatSummaryMaxMessages).toBe(10000);
  });
});
