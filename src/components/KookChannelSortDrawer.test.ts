import { describe, expect, it } from 'vitest';
import type { KookChannelSortConfigUpdate } from '../api/admin';
import { normalizeKookChannelSortConfig } from './KookChannelSortDrawer';

const baseConfig: KookChannelSortConfigUpdate = {
  enabled: true,
  groupIds: ['group-2', 'group-1', 'group-2'],
  scheduleType: 'daily',
  weekday: 3,
  monthday: 12,
  hour: 4,
};

describe('normalizeKookChannelSortConfig', () => {
  it('clears weekday and monthday for a daily schedule', () => {
    expect(normalizeKookChannelSortConfig(baseConfig)).toEqual({
      ...baseConfig,
      groupIds: ['group-2', 'group-1'],
      weekday: null,
      monthday: null,
    });
  });

  it('keeps only weekday for a weekly schedule', () => {
    expect(normalizeKookChannelSortConfig({ ...baseConfig, scheduleType: 'weekly' })).toEqual({
      ...baseConfig,
      scheduleType: 'weekly',
      groupIds: ['group-2', 'group-1'],
      monthday: null,
    });
  });

  it('keeps only monthday for a monthly schedule', () => {
    expect(normalizeKookChannelSortConfig({ ...baseConfig, scheduleType: 'monthly' })).toEqual({
      ...baseConfig,
      scheduleType: 'monthly',
      groupIds: ['group-2', 'group-1'],
      weekday: null,
    });
  });
});
