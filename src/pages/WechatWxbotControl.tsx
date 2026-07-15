import { ReloadOutlined, SaveOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { App as AntApp, Button, Card, Col, Empty, Form, Input, InputNumber, Row, Space, Switch, Table, Tag, Typography } from 'antd';
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

type FormValues = {
  botName?: string;
  adminWxids?: string;
  groupWhitelist?: string;
  commandPrefix?: string;
  atMeRequired?: boolean;
  monitorMessage?: boolean;
  monitorMessageTypes?: string;
  alertMemberChange?: boolean;
  groupCacheTtl?: number;
  welcomeEnabled?: boolean;
  summaryReminderEnabled?: boolean;
  summaryReminderJobs?: string;
};

export default function WechatWxbotControl() {
  const [bots, setBots] = useState<WxbotRecord[]>([]);
  const [selectedBotId, setSelectedBotId] = useState('');
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configUpdatedAt, setConfigUpdatedAt] = useState('');
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
      form.setFieldsValue(configToForm(detail.config || {}));
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
                  <Typography.Text type="secondary">主机：{selectedBot.host || '-'}</Typography.Text>
                </div>
                <Form form={form} layout="vertical" className="wxbot-config-form">
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item label="机器人名称" name="botName">
                        <Input placeholder="WeChatHookBot" />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Item label="命令前缀" name="commandPrefix" rules={[{ max: 3, message: '最长 3 个字符' }]}>
                        <Input placeholder="#" />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Item label="群聊需要 @ 机器人" name="atMeRequired" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item label="管理员 wxid" name="adminWxids" extra="每行一个 wxid。">
                        <Input.TextArea rows={5} placeholder="wxid_xxx" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="群白名单" name="groupWhitelist" extra="每行一个群 ID。为空表示不限制群聊。">
                        <Input.TextArea rows={5} placeholder="47759534463@chatroom" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item label="消息入库" name="monitorMessage" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="成员变动通知" name="alertMemberChange" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="进群欢迎词总开关" name="welcomeEnabled" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item label="入库消息类型" name="monitorMessageTypes" extra="逗号或换行分隔。为空表示全部类型。">
                        <Input placeholder="1, 3, 49" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="群缓存 TTL 秒" name="groupCacheTtl" rules={[{ type: 'number', min: 60, message: '最小 60 秒' }]}>
                        <InputNumber min={60} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item label="接龙汇总定时提醒" name="summaryReminderEnabled" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={16}>
                      <Form.Item label="提醒任务" name="summaryReminderJobs" extra="每行格式：群ID HH:MM。">
                        <Input.TextArea rows={4} placeholder="47759534463@chatroom 18:00" />
                      </Form.Item>
                    </Col>
                  </Row>
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

function configToForm(config: WxbotRemoteConfig): FormValues {
  return {
    botName: config.bot?.name || '',
    adminWxids: lines(config.bot?.admin_wxids || []),
    groupWhitelist: lines(config.bot?.group_whitelist || []),
    commandPrefix: config.bot?.command_prefix ?? '#',
    atMeRequired: config.bot?.at_me_required ?? true,
    monitorMessage: config.monitor?.message ?? true,
    monitorMessageTypes: lines(config.monitor?.message_types || []),
    alertMemberChange: config.monitor?.alert_member_change ?? true,
    groupCacheTtl: config.monitor?.group_cache_ttl ?? 600,
    welcomeEnabled: config.welcome?.enabled ?? true,
    summaryReminderEnabled: config.summary_reminder?.enabled ?? false,
    summaryReminderJobs: (config.summary_reminder?.jobs || []).map((item) => `${item.room_id} ${item.time}`).join('\n'),
  };
}

function formToConfig(values: FormValues): WxbotRemoteConfig {
  return {
    bot: {
      name: (values.botName || '').trim(),
      admin_wxids: splitList(values.adminWxids),
      group_whitelist: splitList(values.groupWhitelist),
      command_prefix: values.commandPrefix ?? '',
      at_me_required: Boolean(values.atMeRequired),
    },
    monitor: {
      message: Boolean(values.monitorMessage),
      message_types: splitList(values.monitorMessageTypes),
      alert_member_change: Boolean(values.alertMemberChange),
      group_cache_ttl: Number(values.groupCacheTtl || 600),
    },
    welcome: {
      enabled: Boolean(values.welcomeEnabled),
    },
    summary_reminder: {
      enabled: Boolean(values.summaryReminderEnabled),
      jobs: parseJobs(values.summaryReminderJobs),
    },
  };
}

function splitList(value?: string) {
  return Array.from(new Set(String(value || '').split(/[\n,，]+/).map((item) => item.trim()).filter(Boolean)));
}

function parseJobs(value?: string) {
  return String(value || '').split('\n').map((line) => {
    const [roomId, time] = line.trim().split(/\s+/, 2);
    return { room_id: roomId || '', time: time || '' };
  }).filter((item) => item.room_id && item.time);
}

function lines(values: string[]) {
  return values.join('\n');
}
