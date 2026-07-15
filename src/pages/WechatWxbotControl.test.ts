import { describe, expect, it } from 'vitest';
import { configToForm, formToConfig, validateWxbotConfig } from './WechatWxbotControl';

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

  it('requires OSS fields only when OSS upload is enabled', () => {
    const config = formToConfig(configToForm({
      bot: { name: 'WeChatHookBot' },
      hook: {
        dll_path: 'hook/libGLESv1.dll',
        inject_exe_path: 'hook/x64 inject.exe',
        receive_mode: 'http',
        http_server_port: 19088,
        callback_url: 'http://127.0.0.1:5000/api/recvMsg',
      },
      database: {
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: 'pwd',
        name: 'wechat_bot',
        charset: 'utf8mb4',
        connect_timeout: 10,
        read_timeout: 10,
        write_timeout: 10,
        batch_size: 100,
        batch_flush_interval: 10,
        message_queue_size: 5000,
      },
      logging: {
        level: 'INFO',
        file: 'data/wechat_hook_bot.log',
        max_size_mb: 10,
        backup_count: 5,
      },
      webhook: { enabled: false },
      welcome: { enabled: false },
      party_site: { enabled: false },
      wxbot_control: { enabled: false },
      oss: { enabled: false },
    }));

    expect(validateWxbotConfig(config)).toBe('');

    config.oss = { enabled: true, endpoint: 'oss-cn-hangzhou.aliyuncs.com' };
    expect(validateWxbotConfig(config)).toBe('OSS Bucket不能为空');
  });
});
