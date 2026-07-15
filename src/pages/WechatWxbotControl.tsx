import { ReloadOutlined, SaveOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { App as AntApp, Button, Card, Col, Empty, Form, Input, InputNumber, Row, Select, Space, Switch, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import {
  getWxbotConfig,
  listWxbots,
  updateWxbotConfig,
  type WxbotRecord,
  type WxbotRemoteConfig,
} from '../api/wechatBot';
import PageHeader from '../components/PageHeader';
import { formatWechatTime } from '../utils/wechatBot';

type FieldType = 'string' | 'password' | 'number' | 'boolean' | 'list' | 'textarea' | 'select';
type ConfigSectionKey = keyof typeof defaultWxbotConfig;
type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  extra?: string;
  options?: Array<{ label: string; value: string }>;
  wide?: boolean;
};

type SectionDef = {
  key: ConfigSectionKey;
  label: string;
  fields: FieldDef[];
};

type FormValues = Record<string, Record<string, unknown>>;

const defaultWxbotConfig = {
  bot: {
    name: 'WeChatHookBot',
    admin_wxids: [
      'wxid_deo1ktwsrh2m22',
      'wxid_ptyeqcy4ll1w22',
      'wxid_4h068vxmdcbt22',
      'wxid_1zus2m379pm522',
      'wxid_rzyidye4aliu22',
    ],
    group_whitelist: [
      '47759534463@chatroom',
      '46348533444@chatroom',
      '45897744734@chatroom',
      '44552449886@chatroom',
      '45707641148@chatroom',
      '46241809307@chatroom',
      '43308858460@chatroom',
    ],
    command_prefix: '',
    at_me_required: true,
  },
  hook: {
    dll_path: 'hook/libGLESv1.dll',
    inject_exe_path: 'hook/x64 inject.exe',
    http_server_port: 19088,
    receive_mode: 'http',
    tcp_ip: '127.0.0.1',
    tcp_port: 61108,
    callback_url: 'http://127.0.0.1:5000/api/recvMsg',
    usedefault: false,
    start_server_while_login: true,
    force_reinject_on_start: false,
  },
  monitor: {
    message: true,
    message_types: [],
    alert_member_change: true,
    group_cache_ttl: 600,
  },
  webhook: {
    enabled: true,
    host: '0.0.0.0',
    port: 5000,
    token: '',
    rate_limit: 60,
    cors_origins: [],
  },
  database: {
    host: '47.102.200.211',
    port: 3306,
    user: 'root',
    password: '',
    name: 'wechat_bot',
    charset: 'utf8mb4',
    connect_timeout: 10,
    read_timeout: 10,
    write_timeout: 10,
    batch_size: 100,
    batch_flush_interval: 10,
  },
  logging: {
    level: 'INFO',
    file: 'data/wechat_hook_bot.log',
    max_size_mb: 10,
    backup_count: 5,
  },
  welcome: {
    enabled: true,
    default_msg: '欢迎 {nickname} 加入 {groupname}！🎉',
  },
  party_site: {
    enabled: true,
    base_url: 'http://47.102.200.211:8081',
    admin_username: 'wxbot',
    admin_password: '',
    token: '',
    timeout: 10,
  },
  summary_reminder: {
    enabled: true,
  },
  wxbot_control: {
    enabled: true,
    base_url: 'https://www.rabbits.ink/miniprogram-api',
    token: '',
    bot_id: 'wxbot-main',
    name: '兔兔窝微信机器人',
    heartbeat_interval: 30,
    config_pull_interval: 30,
    request_timeout: 10,
  },
  oss: {
    enabled: false,
    endpoint: 'oss-cn-hangzhou.aliyuncs.com',
    bucket: 'wechat-bot-images',
    access_key_id: '',
    access_key_secret: '',
    public_base_url: 'https://wechat-bot-images.oss-cn-hangzhou.aliyuncs.com',
    object_prefix: 'wechat/images',
    keep_local: false,
  },
} satisfies WxbotRemoteConfig;

const configSections: SectionDef[] = [
  {
    key: 'bot',
    label: '机器人',
    fields: [
      { key: 'name', label: '机器人名称', type: 'string' },
      { key: 'command_prefix', label: '命令前缀', type: 'string', extra: '为空表示不需要前缀。' },
      { key: 'at_me_required', label: '群聊需要 @ 机器人', type: 'boolean' },
      { key: 'admin_wxids', label: '管理员 wxid', type: 'list', wide: true, extra: '每行一个 wxid。' },
      { key: 'group_whitelist', label: '群白名单', type: 'list', wide: true, extra: '每行一个群 ID，留空表示不限制群聊。' },
    ],
  },
  {
    key: 'hook',
    label: 'Hook',
    fields: [
      { key: 'dll_path', label: 'DLL 路径', type: 'string' },
      { key: 'inject_exe_path', label: '注入程序路径', type: 'string' },
      { key: 'http_server_port', label: 'Hook HTTP 端口', type: 'number' },
      { key: 'receive_mode', label: '接收模式', type: 'select', options: [{ label: 'HTTP', value: 'http' }, { label: 'TCP', value: 'tcp' }] },
      { key: 'tcp_ip', label: 'TCP IP', type: 'string' },
      { key: 'tcp_port', label: 'TCP 端口', type: 'number' },
      { key: 'callback_url', label: '回调地址', type: 'string', wide: true },
      { key: 'usedefault', label: '使用默认注入配置', type: 'boolean' },
      { key: 'start_server_while_login', label: '登录时启动接收服务', type: 'boolean' },
      { key: 'force_reinject_on_start', label: '启动时强制重新注入', type: 'boolean' },
    ],
  },
  {
    key: 'monitor',
    label: '监听',
    fields: [
      { key: 'message', label: '消息入库', type: 'boolean' },
      { key: 'alert_member_change', label: '成员变动通知管理员', type: 'boolean' },
      { key: 'group_cache_ttl', label: '群缓存 TTL 秒', type: 'number' },
      { key: 'message_types', label: '入库消息类型', type: 'list', wide: true, extra: '每行一个消息类型；留空表示全部类型。' },
    ],
  },
  {
    key: 'webhook',
    label: '接口服务',
    fields: [
      { key: 'enabled', label: '启用 Webhook 服务', type: 'boolean' },
      { key: 'host', label: '监听地址', type: 'string' },
      { key: 'port', label: '监听端口', type: 'number' },
      { key: 'token', label: '接口 Token', type: 'password', wide: true },
      { key: 'rate_limit', label: '限流次数', type: 'number' },
      { key: 'cors_origins', label: 'CORS Origins', type: 'list', wide: true, extra: '每行一个允许来源。' },
    ],
  },
  {
    key: 'database',
    label: '数据库',
    fields: [
      { key: 'host', label: 'MySQL 地址', type: 'string' },
      { key: 'port', label: 'MySQL 端口', type: 'number' },
      { key: 'user', label: '用户名', type: 'string' },
      { key: 'password', label: '密码', type: 'password' },
      { key: 'name', label: '数据库名', type: 'string' },
      { key: 'charset', label: '字符集', type: 'string' },
      { key: 'connect_timeout', label: '连接超时秒', type: 'number' },
      { key: 'read_timeout', label: '读取超时秒', type: 'number' },
      { key: 'write_timeout', label: '写入超时秒', type: 'number' },
      { key: 'batch_size', label: '批量入库条数', type: 'number' },
      { key: 'batch_flush_interval', label: '批量刷新间隔秒', type: 'number' },
    ],
  },
  {
    key: 'logging',
    label: '日志',
    fields: [
      { key: 'level', label: '日志级别', type: 'select', options: ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'].map((value) => ({ label: value, value })) },
      { key: 'file', label: '日志文件', type: 'string' },
      { key: 'max_size_mb', label: '单文件大小 MB', type: 'number' },
      { key: 'backup_count', label: '保留文件数', type: 'number' },
    ],
  },
  {
    key: 'welcome',
    label: '欢迎词',
    fields: [
      { key: 'enabled', label: '启用进群欢迎', type: 'boolean' },
      { key: 'default_msg', label: '默认欢迎词', type: 'textarea', wide: true, extra: '支持 {nickname} 和 {groupname}。' },
    ],
  },
  {
    key: 'party_site',
    label: '接龙网站',
    fields: [
      { key: 'enabled', label: '启用接龙网站对接', type: 'boolean' },
      { key: 'base_url', label: '接龙网站地址', type: 'string', wide: true },
      { key: 'admin_username', label: '管理员账号', type: 'string' },
      { key: 'admin_password', label: '管理员密码', type: 'password' },
      { key: 'token', label: '登录 Token', type: 'password', wide: true },
      { key: 'timeout', label: '请求超时秒', type: 'number' },
    ],
  },
  {
    key: 'summary_reminder',
    label: '接龙提醒',
    fields: [
      { key: 'enabled', label: '启用定时提醒', type: 'boolean' },
    ],
  },
  {
    key: 'wxbot_control',
    label: '控制中心',
    fields: [
      { key: 'enabled', label: '启用控制中心连接', type: 'boolean' },
      { key: 'base_url', label: '控制中心 Base URL', type: 'string', wide: true },
      { key: 'token', label: '控制中心 Token', type: 'password', wide: true },
      { key: 'bot_id', label: '机器人 ID', type: 'string' },
      { key: 'name', label: '控制中心显示名', type: 'string' },
      { key: 'heartbeat_interval', label: '心跳间隔秒', type: 'number' },
      { key: 'config_pull_interval', label: '配置拉取间隔秒', type: 'number' },
      { key: 'request_timeout', label: '请求超时秒', type: 'number' },
    ],
  },
  {
    key: 'oss',
    label: 'OSS',
    fields: [
      { key: 'enabled', label: '启用 OSS 上传', type: 'boolean' },
      { key: 'endpoint', label: 'Endpoint', type: 'string' },
      { key: 'bucket', label: 'Bucket', type: 'string' },
      { key: 'access_key_id', label: 'AccessKey ID', type: 'password' },
      { key: 'access_key_secret', label: 'AccessKey Secret', type: 'password' },
      { key: 'public_base_url', label: '公开访问地址', type: 'string', wide: true },
      { key: 'object_prefix', label: '对象前缀', type: 'string' },
      { key: 'keep_local', label: '保留本地图片', type: 'boolean' },
    ],
  },
];

export default function WechatWxbotControl() {
  const [bots, setBots] = useState<WxbotRecord[]>([]);
  const [selectedBotId, setSelectedBotId] = useState('');
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configUpdatedAt, setConfigUpdatedAt] = useState('');
  const [configSource, setConfigSource] = useState('');
  const [form] = Form.useForm<FormValues>();
  const { message } = AntApp.useApp();

  const selectedBot = bots.find((item) => item.botId === selectedBotId);

  const loadBots = async () => {
    setLoading(true);
    try {
      const result = await listWxbots();
      const list = result.list || [];
      setBots(list);
      const next = selectedBotId && list.some((item) => item.botId === selectedBotId)
        ? selectedBotId
        : list[0]?.botId || '';
      setSelectedBotId(next);
      if (next) await loadConfig(next);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '机器人列表加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async (botId: string) => {
    setConfigLoading(true);
    try {
      const detail = await getWxbotConfig(botId);
      const savedConfig = detail.config || {};
      const currentConfig = detail.currentConfig || {};
      const nextConfig = hasConfig(currentConfig) ? mergeConfig(currentConfig, savedConfig) : mergeConfig(defaultWxbotConfig, savedConfig);
      form.setFieldsValue(configToForm(nextConfig));
      setConfigSource(configSourceText(savedConfig, currentConfig));
      setConfigUpdatedAt(detail.configUpdatedAt || '');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '机器人配置加载失败');
    } finally {
      setConfigLoading(false);
    }
  };

  const selectBot = (botId: string) => {
    setSelectedBotId(botId);
    void loadConfig(botId);
  };

  const saveConfig = async () => {
    if (!selectedBotId) return;
    const values = await form.validateFields();
    setSaving(true);
    try {
      const detail = await updateWxbotConfig(selectedBotId, formToConfig(values));
      setConfigUpdatedAt(detail.configUpdatedAt || '');
      message.success('配置已保存，机器人会在下一次拉取时生效');
      await loadBots();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '配置保存失败');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    void loadBots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: ColumnsType<WxbotRecord> = [
    {
      title: '实例',
      render: (_, row) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{row.name || row.botId}</Typography.Text>
          <Typography.Text type="secondary" className="mono">{row.botId}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '状态',
      width: 110,
      render: (_, row) => <Tag color={row.online ? 'green' : 'default'}>{row.online ? '在线' : '离线'}</Tag>,
    },
    { title: '微信ID', dataIndex: 'wxid', width: 180, className: 'mono', render: (value) => value || '-' },
    { title: '最后心跳', dataIndex: 'lastSeenAt', width: 170, render: (value) => formatWechatTime(value) || '-' },
  ];

  return (
    <>
      <PageHeader
        title="微信机器人控制"
        description="查看 Windows wxbot 在线状态，远程下发白名单、管理员和提醒配置。"
        extra={<Button icon={<ReloadOutlined />} loading={loading} onClick={loadBots}>刷新</Button>}
      />
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card title="wxbot 实例" loading={loading}>
            {bots.length ? (
              <Table
                rowKey="botId"
                size="small"
                columns={columns}
                dataSource={bots}
                pagination={false}
                rowClassName={(row) => (row.botId === selectedBotId ? 'selected-row' : '')}
                onRow={(row) => ({ onClick: () => selectBot(row.botId) })}
                scroll={{ x: 720 }}
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无机器人连接" />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card
            title={<Space><ThunderboltOutlined />远程配置</Space>}
            loading={configLoading}
            extra={<Button type="primary" icon={<SaveOutlined />} disabled={!selectedBotId} loading={saving} onClick={saveConfig}>保存</Button>}
          >
            {selectedBot ? (
              <>
                <div className="wxbot-config-meta">
                  <Typography.Text type="secondary">配置更新时间：{formatWechatTime(configUpdatedAt) || '-'}</Typography.Text>
                  <Typography.Text type="secondary">应用时间：{formatWechatTime(selectedBot.configAppliedAt) || '-'}</Typography.Text>
                  <Typography.Text type="secondary">当前展示：{configSource || '-'}</Typography.Text>
                  <Typography.Text type="secondary">主机：{selectedBot.host || '-'}</Typography.Text>
                </div>
                <Form form={form} layout="vertical" className="wxbot-config-form">
                  <Tabs
                    className="wxbot-config-tabs"
                    tabPosition="left"
                    items={configSections.map((section) => ({
                      key: section.key,
                      label: section.label,
                      children: (
                        <div className="wxbot-field-grid">
                          {section.fields.map((field) => (
                            <Form.Item
                              key={`${section.key}.${field.key}`}
                              className={field.wide ? 'wxbot-wide-field' : undefined}
                              label={field.label}
                              name={[section.key, field.key]}
                              valuePropName={field.type === 'boolean' ? 'checked' : 'value'}
                              extra={field.extra}
                            >
                              {renderField(field)}
                            </Form.Item>
                          ))}
                        </div>
                      ),
                    }))}
                  />
                </Form>
              </>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请选择一个 wxbot 实例" />
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
}

function renderField(field: FieldDef) {
  if (field.type === 'boolean') return <Switch checkedChildren="开" unCheckedChildren="关" />;
  if (field.type === 'number') return <InputNumber min={0} precision={0} style={{ width: '100%' }} />;
  if (field.type === 'password') return <Input.Password autoComplete="off" className="mono" />;
  if (field.type === 'textarea') return <Input.TextArea rows={4} />;
  if (field.type === 'list') return <Input.TextArea rows={5} className="mono" />;
  if (field.type === 'select') return <Select options={field.options || []} />;
  return <Input className="mono" />;
}

function hasConfig(config: WxbotRemoteConfig) {
  return Object.keys(config || {}).length > 0;
}

function configSourceText(savedConfig: WxbotRemoteConfig, currentConfig: WxbotRemoteConfig) {
  if (hasConfig(savedConfig) && hasConfig(currentConfig)) return '机器人当前配置 + 远程覆盖';
  if (hasConfig(savedConfig)) return '远程配置';
  if (hasConfig(currentConfig)) return '机器人当前配置';
  return '默认配置';
}

function mergeConfig(base: WxbotRemoteConfig, override: WxbotRemoteConfig): WxbotRemoteConfig {
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  Object.entries(override || {}).forEach(([key, value]) => {
    const baseValue = result[key];
    if (isPlainObject(baseValue) && isPlainObject(value)) {
      result[key] = { ...baseValue, ...value };
    } else {
      result[key] = value;
    }
  });
  return result as WxbotRemoteConfig;
}

function configToForm(config: WxbotRemoteConfig): FormValues {
  const result: FormValues = {};
  configSections.forEach((section) => {
    const source = ((config as Record<string, unknown>)[section.key] || {}) as Record<string, unknown>;
    result[section.key] = {};
    section.fields.forEach((field) => {
      const value = source[field.key];
      if (field.type === 'list') {
        result[section.key][field.key] = Array.isArray(value) ? value.join('\n') : '';
      } else {
        result[section.key][field.key] = value;
      }
    });
  });
  return result;
}

function formToConfig(values: FormValues): WxbotRemoteConfig {
  const result: Record<string, Record<string, unknown>> = {};
  configSections.forEach((section) => {
    const source = values[section.key] || {};
    result[section.key] = {};
    section.fields.forEach((field) => {
      const value = source[field.key];
      if (field.type === 'list') {
        result[section.key][field.key] = splitLines(value);
      } else if (field.type === 'number') {
        result[section.key][field.key] = Number(value || 0);
      } else {
        result[section.key][field.key] = value ?? '';
      }
    });
  });
  return result as WxbotRemoteConfig;
}

function splitLines(value: unknown) {
  return Array.from(new Set(String(value || '').split(/[\n,，]+/).map((item) => item.trim()).filter(Boolean)));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
