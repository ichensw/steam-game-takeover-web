import { describe, expect, it } from 'vitest';
import {
  buildQuery,
  formatCell,
  formatDateTime,
  formatWechatTime,
  lastNDaysRange,
  previewText,
  summaryPayload,
  toApiTime,
  wechatMessageSubTypeLabel,
  wechatMessageTypeLabel,
} from './wechatBot';

describe('WeChat bot admin utilities', () => {
  it('builds queries without empty values', () => {
    expect(buildQuery({ roomId: 'room', keyword: 'steam game', sender: '', page: 1, pageSize: 50 }))
      .toBe('roomId=room&keyword=steam+game&page=1&pageSize=50');
  });

  it('normalizes datetime-local values for backend parsing', () => {
    expect(toApiTime('2026-07-08T09:15')).toBe('2026-07-08T09:15:00');
    expect(toApiTime('2026-07-08T09:15:30')).toBe('2026-07-08T09:15:30');
  });

  it('sends custom summary ranges without a date', () => {
    expect(summaryPayload({
      roomId: 'room',
      date: '2026-07-08',
      period: 'custom',
      start: '2026-07-08T09:00',
      end: '2026-07-08T10:00',
    })).toEqual({
      roomId: 'room',
      period: 'custom',
      start: '2026-07-08T09:00:00',
      end: '2026-07-08T10:00:00',
    });
  });

  it('sends preset summary periods with a date', () => {
    expect(summaryPayload({ roomId: '', date: '2026-07-08', period: 'morning' })).toEqual({
      date: '2026-07-08',
      period: 'morning',
    });
  });

  it('formats dynamic cells and truncates previews', () => {
    expect(formatCell(null)).toBe('');
    expect(formatCell({ text: 'hello' })).toBe('hello');
    expect(formatCell({ nested: true })).toBe('{"nested":true}');
    expect(previewText('abcdef', 3)).toBe('abc...');
    expect(previewText('abc', 3)).toBe('abc');
  });

  it('formats frontend times as yyyy-MM-dd HH:mm:ss', () => {
    expect(formatDateTime('2026-07-13T10:20:30+08:00')).toBe('2026-07-13 10:20:30');
    expect(formatDateTime('2026-07-13T10:20')).toBe('2026-07-13 10:20:00');
    expect(formatDateTime('2026-07-13 10:20:30')).toBe('2026-07-13 10:20:30');
  });

  it('formats structured message times and keeps legacy strings', () => {
    expect(formatWechatTime({ unix: 1783918830, text: '2026-07-13 10:20:30' }))
      .toBe('2026-07-13 10:20:30');
    expect(formatWechatTime('2026-07-13T10:20:30+08:00')).toBe('2026-07-13 10:20:30');
    expect(formatWechatTime('2026-07-13 10:20:30')).toBe('2026-07-13 10:20:30');
    expect(formatWechatTime(undefined)).toBe('-');
  });

  it('labels all stored message types and their system subtypes', () => {
    expect(wechatMessageTypeLabel(48)).toBe('位置');
    expect(wechatMessageTypeLabel(10000)).toBe('群系统消息');
    expect(wechatMessageTypeLabel(10002)).toBe('系统通知');
    expect(wechatMessageTypeLabel(99999)).toBe('类型 99999');
    expect(wechatMessageSubTypeLabel('group_join')).toBe('进群通知');
    expect(wechatMessageSubTypeLabel('revoke')).toBe('撤回消息');
    expect(wechatMessageSubTypeLabel('mini_program')).toBe('小程序卡片');
  });

  it('builds an inclusive seven-day statistics range', () => {
    expect(lastNDaysRange(7, new Date(2026, 6, 13, 12, 0, 0))).toEqual({
      start: '2026-07-07',
      end: '2026-07-13',
    });
  });
});
