import { ReloadOutlined, SaveOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { App as AntApp, Button, Card, Col, Empty, Form, Input, Row, Space, Table, Tag, Typography } from 'antd';
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
  configJson?: string;
};

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
      const nextConfig = hasConfig(currentConfig) ? mergeConfig(currentConfig, savedConfig) : savedConfig;
      form.setFieldsValue({ configJson: JSON.stringify(nextConfig, null, 2) });
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
      const detail = await updateWxbotConfig(selectedBotId, parseConfigJson(values.configJson));
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
                  <Form.Item
                    label="完整配置 JSON"
                    name="configJson"
                    rules={[{ required: true, message: '请输入配置 JSON' }]}
                    extra="保存后机器人会拉取并写入本机 config.yaml；运行中的连接类配置通常重启后完全生效。"
                  >
                    <Input.TextArea rows={30} className="mono" spellCheck={false} />
                  </Form.Item>
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

function hasConfig(config: WxbotRemoteConfig) {
  return Object.keys(config || {}).length > 0;
}

function configSourceText(savedConfig: WxbotRemoteConfig, currentConfig: WxbotRemoteConfig) {
  if (hasConfig(savedConfig) && hasConfig(currentConfig)) return '机器人当前配置 + 远程覆盖';
  if (hasConfig(savedConfig)) return '远程配置';
  if (hasConfig(currentConfig)) return '机器人当前配置';
  return '-';
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseConfigJson(value?: string): WxbotRemoteConfig {
  try {
    const parsed = JSON.parse(value || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('配置必须是 JSON 对象');
    }
    return parsed;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '配置 JSON 格式错误');
  }
}
