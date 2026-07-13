import { Button, Card, Form, Input, InputNumber, Space, Switch, Typography, App as AntApp } from 'antd';
import { useEffect, useState } from 'react';
import { getSettings, refreshTakeoverSummaries, updateSettings } from '../api/admin';
import PageHeader from '../components/PageHeader';
import { normalizeSettings, sensitiveSettingsKeys, type SettingsValues } from '../utils/settings';

function kookWebhookUrl() {
  return 'https://www.rabbits.ink/miniprogram-api/api/kook/webhook?compress=0';
}

export default function Settings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [refreshingSummaries, setRefreshingSummaries] = useState(false);
  const [initialValues, setInitialValues] = useState<SettingsValues>({});
  const { message, modal } = AntApp.useApp();
  const currentValues = normalizeSettings(Form.useWatch([], form) || initialValues);
  const webhookUrl = kookWebhookUrl();

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = normalizeSettings((await getSettings()) as SettingsValues);
      setInitialValues(data);
      form.setFieldsValue(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (values: SettingsValues) => {
    setSubmitting(true);
    try {
      await updateSettings(normalizeSettings(values));
      message.success('系统设置已保存');
      await loadSettings();
    } finally {
      setSubmitting(false);
    }
  };

  const onFinish = async (values: SettingsValues) => {
    const next = normalizeSettings(values);
    const previous = normalizeSettings(initialValues);
    const changedSensitiveKeys = sensitiveSettingsKeys.filter((key) => next[key] !== previous[key]);
    if (changedSensitiveKeys.length > 0) {
      modal.confirm({
        title: '确认更新敏感配置？',
        content: '你修改了外部服务密钥。保存后会立即影响 Steam 校验或 KOOK 相关功能。',
        okText: '确认保存',
        cancelText: '取消',
        onOk: () => save(next),
      });
      return;
    }
    await save(next);
  };

  const reset = () => {
    form.setFieldsValue(initialValues);
    message.info('已恢复为最近一次加载的配置');
  };

  const refresh = async () => {
    await loadSettings();
    message.success('配置已刷新');
  };

  const copy = async (text: string, successText: string) => {
    await navigator.clipboard.writeText(text);
    message.success(successText);
  };

  const testWebhook = async () => {
    const challenge = `codex-${Date.now()}`;
    setTestingWebhook(true);
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge }),
      });
      const data = await response.json();
      if (!response.ok || data.challenge !== challenge) {
        throw new Error(data.message || 'challenge 返回不匹配');
      }
      message.success('Webhook 链路正常：challenge 已返回');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Webhook 链路测试失败');
    } finally {
      setTestingWebhook(false);
    }
  };

  const refreshSummaries = () => {
    modal.confirm({
      title: '生成历史未结束接龙汇总词？',
      content: '会为未结束且非人工汇总词的接龙重新生成展示词，可能触发多次 AI 调用。',
      okText: '开始生成',
      cancelText: '取消',
      onOk: async () => {
        setRefreshingSummaries(true);
        try {
          const result = await refreshTakeoverSummaries();
          message.success(`已处理 ${result.count} 个接龙`);
        } finally {
          setRefreshingSummaries(false);
        }
      },
    });
  };

  return (
    <>
      <PageHeader
        title="系统设置"
        description="维护发布开关、Steam 校验、KOOK 和 AI 汇总配置。"
        extra={
          <Button onClick={refresh} loading={loading}>
            刷新配置
          </Button>
        }
      />
      <Card className="settings-card" loading={loading}>
        <Form form={form} layout="vertical" onFinish={onFinish} disabled={submitting}>
          <Form.Item
            label="全局允许发布接龙"
            name="publishTakeoverEnabled"
            valuePropName="checked"
            extra="关闭后，只有发布白名单用户可以看到并使用发布接龙入口。"
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
          <Form.Item
            label="每日接龙有效天数"
            name="dailyTakeoverExpirationDays"
            extra="每日类型接龙从创建时间起超过该天数后自动标记为已结束，默认 10 天。"
            rules={[{ required: true, message: '请输入 1 至 365 天' }]}
          >
            <InputNumber
              min={1}
              max={365}
              step={1}
              precision={0}
              className="settings-number-input"
            />
          </Form.Item>
          <Form.Item
            label="UAPI 调用密钥"
            name="uapiKey"
            extra="用于 Steam 好友码校验。修改后请用测试 SteamID 验证保存资料链路。"
          >
            <Input.Password placeholder="用于 SteamID 校验的 UAPI Key" autoComplete="off" />
          </Form.Item>
          <Form.Item
            label="Steam Web API Key"
            name="steamWebApiKey"
            extra="Steam 官方 API Key，当前为空也可以保存。"
          >
            <Input.Password placeholder="Steam 官方 API Key，按需配置" autoComplete="off" />
          </Form.Item>
          <Form.Item
            label="KOOK Bot Token"
            name="kookBotToken"
            extra="用于查询频道、生成频道邀请链接。"
          >
            <Input.Password placeholder="KOOK 机器人 Token" autoComplete="off" />
          </Form.Item>
          <Form.Item
            label="KOOK 服务器 ID"
            name="kookGuildId"
            extra="KOOK Guild ID，只填写数字 ID。"
          >
            <Input placeholder="KOOK Guild ID" className="mono" />
          </Form.Item>
          <Form.Item
            label="KOOK Webhook Verify Token"
            name="kookVerifyToken"
            extra="KOOK Webhook 校验 token，需和 KOOK 平台配置一致。"
          >
            <Input.Password placeholder="KOOK Webhook Verify Token" autoComplete="off" />
          </Form.Item>
          <Form.Item
            label="KOOK Webhook Encrypt Key"
            name="kookEncryptKey"
            extra="用于解密 KOOK Webhook 加密消息，需与 KOOK 官方机器人后台的 Encrypt Key 完全一致。"
          >
            <Input.Password placeholder="KOOK Webhook Encrypt Key" autoComplete="off" />
          </Form.Item>
          <Form.Item label="KOOK Webhook 地址">
            <Typography.Text className="mono">{webhookUrl}</Typography.Text>
          </Form.Item>
          <Form.Item label="KOOK 复制">
            <Space wrap>
              <Button onClick={() => copy(webhookUrl, '已复制 KOOK 回调地址')}>
                复制 KOOK 回调地址
              </Button>
              <Button
                onClick={() => copy(currentValues.kookVerifyToken || '', '已复制 KOOK Verify Token')}
                disabled={!currentValues.kookVerifyToken}
              >
                复制 KOOK Verify Token
              </Button>
              <Button onClick={testWebhook} loading={testingWebhook}>
                测试 Webhook 连通性
              </Button>
            </Space>
            <Typography.Paragraph type="secondary" className="settings-note">
              当前测试只验证后端 challenge 链路是否正常，不代表 KOOK 已经推送真实入服/退服事件。
            </Typography.Paragraph>
          </Form.Item>
          <Form.Item label="KOOK 配置说明">
            <Typography.Paragraph>
              KOOK 后台连接模式选择 webhook
              <br />
              Callback Url 填写本页 KOOK Webhook 地址
              <br />
              Verify Token 必须与本页 KOOK Webhook Verify Token 一致
              <br />
              Encrypt Key 必须与本页 KOOK Webhook Encrypt Key 一致
              <br />
              配置完成后，在 KOOK 官方机器人后台点击“测试url”
              <br />
              测试通过后点击“机器人上线”
            </Typography.Paragraph>
          </Form.Item>
          <Form.Item label="KOOK 配置状态检查">
            <Space wrap>
              <Typography.Text type={currentValues.kookBotToken ? 'success' : 'danger'}>
                Bot Token {currentValues.kookBotToken ? '已填写' : '未填写'}
              </Typography.Text>
              <Typography.Text type={currentValues.kookGuildId ? 'success' : 'danger'}>
                KOOK 服务器 ID {currentValues.kookGuildId ? '已填写' : '未填写'}
              </Typography.Text>
              <Typography.Text type={currentValues.kookVerifyToken ? 'success' : 'danger'}>
                Webhook Verify Token {currentValues.kookVerifyToken ? '已填写' : '未填写'}
              </Typography.Text>
              <Typography.Text type={currentValues.kookEncryptKey ? 'success' : 'danger'}>
                Webhook Encrypt Key {currentValues.kookEncryptKey ? '已填写' : '未填写'}
              </Typography.Text>
              <Typography.Text type={webhookUrl.includes('?compress=0') ? 'success' : 'danger'}>
                Webhook 地址{webhookUrl.includes('?compress=0') ? '包含' : '缺少'} ?compress=0
              </Typography.Text>
            </Space>
          </Form.Item>
          <Form.Item
            label="AI 汇总词提取"
            name="aiExtractEnabled"
            valuePropName="checked"
            extra="开启后，创建或编辑接龙时会尝试提取接龙汇总展示词；失败会自动使用规则兜底。"
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
          <Form.Item label="AI OpenAI Compatible Base URL" name="aiExtractBaseUrl">
            <Input placeholder="https://xxx/compatible-mode/v1" className="mono" />
          </Form.Item>
          <Form.Item label="AI 模型 / Agent ID" name="aiExtractModel">
            <Input placeholder="模型名或 Agent ID" className="mono" />
          </Form.Item>
          <Form.Item label="AI API Key" name="aiExtractApiKey">
            <Input.Password placeholder="AI API Key" autoComplete="off" />
          </Form.Item>
          <Form.Item label="AI 配置状态检查">
            <Space wrap>
              <Typography.Text type={currentValues.aiExtractEnabled ? 'success' : 'secondary'}>
                AI 提取 {currentValues.aiExtractEnabled ? '已开启' : '未开启'}
              </Typography.Text>
              <Typography.Text type={currentValues.aiExtractBaseUrl ? 'success' : 'danger'}>
                Base URL {currentValues.aiExtractBaseUrl ? '已填写' : '未填写'}
              </Typography.Text>
              <Typography.Text type={currentValues.aiExtractModel ? 'success' : 'danger'}>
                模型 {currentValues.aiExtractModel ? '已填写' : '未填写'}
              </Typography.Text>
              <Typography.Text type={currentValues.aiExtractApiKey ? 'success' : 'danger'}>
                API Key {currentValues.aiExtractApiKey ? '已填写' : '未填写'}
              </Typography.Text>
            </Space>
          </Form.Item>
          <Form.Item label="历史接龙汇总词">
            <Space wrap>
              <Button onClick={refreshSummaries} loading={refreshingSummaries}>
                生成未结束接龙汇总词
              </Button>
              <Typography.Text type="secondary">
                仅处理未结束且非人工汇总词的接龙。
              </Typography.Text>
            </Space>
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              保存设置
            </Button>
            <Button onClick={reset} disabled={submitting}>
              撤销修改
            </Button>
          </Space>
          <Typography.Paragraph type="secondary" className="settings-note">
            敏感密钥保存前会二次确认；保存成功后页面会重新读取服务端配置。
          </Typography.Paragraph>
        </Form>
      </Card>
    </>
  );
}
