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
});
