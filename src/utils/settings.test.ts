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

  it('migrates legacy AI credentials into the selected provider', () => {
    const gpt = normalizeSettings({
      aiExtractBaseUrl: 'https://gpt.example.com/v1/',
      aiExtractApiKey: 'gpt-key',
    });
    expect(gpt.aiExtractProvider).toBe('gpt');
    expect(gpt.aiExtractGptBaseUrl).toBe('https://gpt.example.com/v1');
    expect(gpt.aiExtractGptApiKey).toBe('gpt-key');

    const doubao = normalizeSettings({
      aiExtractBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      aiExtractApiKey: 'ark-key',
    });
    expect(doubao.aiExtractProvider).toBe('doubao');
    expect(doubao.aiExtractDoubaoApiKey).toBe('ark-key');
    expect(doubao.aiExtractGptApiKey).toBe('');
  });

  it('uses only models available from the selected provider', () => {
    expect(normalizeSettings({ aiExtractProvider: 'gpt', aiExtractModel: 'codex-mini-latest' }).aiExtractModel).toBe('codex-mini-latest');
    expect(normalizeSettings({ aiExtractProvider: 'gpt', aiExtractModel: '' }).aiExtractModel).toBe('codex-mini-latest');
    expect(normalizeSettings({ aiExtractProvider: 'gpt', aiExtractModel: 'gpt-5.5' }).aiExtractModel).toBe('gpt-5.5');
    expect(normalizeSettings({ aiExtractProvider: 'doubao', aiExtractModel: 'gpt-5.5' }).aiExtractModel).toBe('doubao-seed-2-0-mini-260428');
  });
});
