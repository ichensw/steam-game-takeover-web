import { describe, expect, it } from 'vitest';

import { observationErrorCount } from './WechatAiMemory';

describe('WechatAiMemory', () => {
  it('handles a legacy null recentErrors response', () => {
    expect(observationErrorCount(null)).toBe(0);
  });
});
