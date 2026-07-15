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

  it('normalizes wechat summary prompt options', () => {
    const settings = normalizeSettings({
      wechatSummaryPrompt: '  保留游戏名  ',
      wechatSummaryStyle: 'detailed',
      wechatSummaryModel: ' gpt-5.5 ',
      wechatSummaryCompareModels: 'gpt-5.5, gpt-4o\nclaude-sonnet,gpt-4o',
    });

    expect(settings.wechatSummaryPrompt).toBe('保留游戏名');
    expect(settings.wechatSummaryStyle).toBe('detailed');
    expect(settings.wechatSummaryModel).toBe('gpt-5.5');
    expect(settings.wechatSummaryCompareModels).toBe('gpt-5.5,gpt-4o,claude-sonnet');
  });

  it('normalizes wechat summary daily schedules', () => {
    const schedules = normalizeSettings({
      wechatSummaryDailySchedules: [
        { enabled: true, time: '12:00', dateMode: 'yesterday', period: 'morning', roomId: ' r1 ', name: ' 上午 ' },
        { enabled: true, time: '24:00', period: 'bad' as never },
      ],
    }).wechatSummaryDailySchedules;

    expect(schedules).toEqual([
      { enabled: true, time: '12:00', dateMode: 'yesterday', period: 'morning', roomId: 'r1', name: '上午' },
      { enabled: true, time: '09:00', dateMode: 'today', period: 'day', roomId: '', name: '' },
    ]);
  });

  it('defaults empty wechat summary daily schedules to morning, afternoon, and evening', () => {
    expect(normalizeSettings({}).wechatSummaryDailySchedules).toEqual([
      { enabled: true, time: '12:00', dateMode: 'today', period: 'morning', name: '上午总结' },
      { enabled: true, time: '18:00', dateMode: 'today', period: 'afternoon', name: '下午总结' },
      { enabled: true, time: '23:00', dateMode: 'today', period: 'evening', name: '晚上总结' },
    ]);
  });

  it('drops unknown wechat summary styles', () => {
    expect(normalizeSettings({ wechatSummaryStyle: 'random' }).wechatSummaryStyle).toBe('');
    expect(normalizeSettings({ wechatSummaryStyle: 'fun' }).wechatSummaryStyle).toBe('fun');
  });
});
