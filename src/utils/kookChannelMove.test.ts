import { describe, expect, it } from 'vitest';
import { buildKookMoveCandidate } from './kookChannelMove';

describe('buildKookMoveCandidate', () => {
  it('moves a channel to the bottom of a dropped-on category', () => {
    expect(
      buildKookMoveCandidate(
        { id: 'voice-1', type: 2, parentId: 'group-1' },
        { id: 'group-2', type: 0, parentId: '0' },
        'inside',
        false,
      ),
    ).toEqual({ targetParentId: 'group-2', placement: 'bottom' });
  });

  it('moves a channel before or after its sibling according to the drop half', () => {
    const source = { id: 'voice-1', type: 2, parentId: 'group-1' };
    const target = { id: 'voice-2', type: 2, parentId: 'group-1' };

    expect(buildKookMoveCandidate(source, target, 'before', false)).toEqual({
      targetParentId: 'group-1',
      placement: 'before',
      anchorChannelId: 'voice-2',
    });
    expect(buildKookMoveCandidate(source, target, 'after', false)).toEqual({
      targetParentId: 'group-1',
      placement: 'after',
      anchorChannelId: 'voice-2',
    });
  });

  it('reorders categories at the root level', () => {
    expect(
      buildKookMoveCandidate(
        { id: 'group-2', type: 0, parentId: '' },
        { id: 'group-1', type: 0, parentId: '0' },
        'before',
        false,
      ),
    ).toEqual({
      targetParentId: '0',
      placement: 'before',
      anchorChannelId: 'group-1',
    });
  });

  it('rejects nesting a category inside another category', () => {
    expect(
      buildKookMoveCandidate(
        { id: 'group-1', type: 0, parentId: '0' },
        { id: 'group-2', type: 0, parentId: '0' },
        'inside',
        false,
      ),
    ).toBeNull();
  });

  it('rejects moves while the channel list is filtered', () => {
    expect(
      buildKookMoveCandidate(
        { id: 'voice-1', type: 2, parentId: 'group-1' },
        { id: 'voice-2', type: 2, parentId: 'group-1' },
        'after',
        true,
      ),
    ).toBeNull();
  });
});
