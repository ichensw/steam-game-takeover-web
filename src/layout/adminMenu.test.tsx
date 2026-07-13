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

  it('maps every WeChat route to the same open group', () => {
    expect(openKeyByPath['/wechat-messages']).toBe('wechat-group');
    expect(openKeyByPath['/wechat-summary']).toBe('wechat-group');
    expect(openKeyByPath['/wechat-database']).toBe('wechat-group');
  });
});
