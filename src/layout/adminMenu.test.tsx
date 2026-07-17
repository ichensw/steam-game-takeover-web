import { describe, expect, it } from 'vitest';
import { buildMenuItems, openKeyByPath } from './AdminLayout';

type TestMenuItem = { key?: React.Key; children?: TestMenuItem[] } | null;

function group(items: TestMenuItem[], key: string) {
  return items.find((item) => item?.key === key);
}

describe('WeChat bot admin navigation', () => {
  it('shows only authorized WeChat child pages', () => {
    const items = buildMenuItems(['dashboard', 'wechat-summary']) as TestMenuItem[];
    const wechat = group(items, 'wechat-group');
    expect(wechat?.children?.map((item) => item?.key)).toEqual(['/wechat-summary']);
  });

  it('hides the WeChat group without any WeChat permission', () => {
    const items = buildMenuItems(['dashboard', 'users']) as TestMenuItem[];
    expect(group(items, 'wechat-group')).toBeUndefined();
  });

  it('shows chat statistics for the dedicated permission', () => {
    const items = buildMenuItems(['dashboard', 'wechat-stats']) as TestMenuItem[];
    const wechat = group(items, 'wechat-group');
    expect(wechat?.children?.map((item) => item?.key)).toEqual(['/wechat-stats']);
  });

  it('maps every WeChat route to the same open group', () => {
    expect(openKeyByPath['/wechat-messages']).toBe('wechat-group');
    expect(openKeyByPath['/wechat-summary']).toBe('wechat-group');
    expect(openKeyByPath['/wechat-stats']).toBe('wechat-group');
    expect(openKeyByPath['/wechat-database']).toBe('wechat-group');
    expect(openKeyByPath['/wechat-wxbots']).toBe('wechat-group');
  });

  it('shows wxbot control for the dedicated permission', () => {
    const items = buildMenuItems(['dashboard', 'wechat-wxbot-control']) as TestMenuItem[];
    const wechat = group(items, 'wechat-group');
    expect(wechat?.children?.map((item) => item?.key)).toEqual(['/wechat-wxbots']);
  });

  it('shows user block management for the dedicated permission', () => {
    const items = buildMenuItems(['dashboard', 'user-blocks']) as TestMenuItem[];
    const userGroup = group(items, 'user-group');
    expect(userGroup?.children?.map((item) => item?.key)).toEqual(['/user-blocks']);
    expect(openKeyByPath['/user-blocks']).toBe('user-group');
  });
});
