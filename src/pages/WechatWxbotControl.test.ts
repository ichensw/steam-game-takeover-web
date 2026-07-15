import { describe, expect, it } from 'vitest';
import { configToForm, formToConfig } from './WechatWxbotControl';

describe('WechatWxbotControl config form mapping', () => {
  it('keeps boolean fields as booleans', () => {
    const form = configToForm({
      hook: {
        usedefault: 'false',
        start_server_while_login: true,
      },
    });

    expect(form.hook.usedefault).toBe(false);
    expect(formToConfig(form).hook?.usedefault).toBe(false);
    expect(formToConfig({ hook: { usedefault: undefined } }).hook?.usedefault).toBe(false);
  });
});
