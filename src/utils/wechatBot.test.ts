import { describe, expect, it } from 'vitest';
import { buildQuery, formatCell, previewText, summaryPayload, toApiTime } from './wechatBot';

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
});
