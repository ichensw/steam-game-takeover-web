import { describe, expect, it } from 'vitest';
import { permissionObjectId, permissionObjectName } from './EntityDetail';

describe('KOOK 频道权限对象', () => {
  it('优先使用嵌套 KOOK 用户昵称，并保留用户 ID', () => {
    const permission = {
      user: { id: 'kook-42', nickname: '兔兔' },
      objectName: '旧名称',
    };

    expect(permissionObjectName(permission)).toBe('兔兔');
    expect(permissionObjectId(permission)).toBe('kook-42');
  });
});
