import type { KookChannelMoveRequest } from '../api/admin';

export type KookChannelMoveNode = {
  id: string | number;
  type: number;
  parentId?: string | number | null;
};

export type KookChannelDropMode = 'inside' | 'before' | 'after';

function rootParentId(parentId: KookChannelMoveNode['parentId']) {
  return parentId ? String(parentId) : '0';
}

export function buildKookMoveCandidate(
  source: KookChannelMoveNode,
  target: KookChannelMoveNode,
  mode: KookChannelDropMode,
  disabled: boolean,
): KookChannelMoveRequest | null {
  if (disabled || String(source.id) === String(target.id)) return null;

  const sourceIsCategory = source.type === 0;
  const targetIsCategory = target.type === 0;

  if (mode === 'inside') {
    if (sourceIsCategory || !targetIsCategory) return null;
    return { targetParentId: String(target.id), placement: 'bottom' };
  }

  if (sourceIsCategory) {
    if (
      !targetIsCategory ||
      rootParentId(source.parentId) !== '0' ||
      rootParentId(target.parentId) !== '0'
    ) {
      return null;
    }
  } else if (targetIsCategory) {
    return null;
  }

  return {
    targetParentId: rootParentId(target.parentId),
    placement: mode,
    anchorChannelId: String(target.id),
  };
}
