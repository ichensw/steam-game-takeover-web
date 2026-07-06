import { Button, Card, Form, Input, Space, Switch, Typography, App as AntApp } from 'antd';
import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../api/admin';
import PageHeader from '../components/PageHeader';

type SettingsValues = {
  publishTakeoverEnabled?: boolean;
  uapiKey?: string;
  steamWebApiKey?: string;
  kookBotToken?: string;
  kookGuildId?: string;
};

const sensitiveKeys: Array<keyof SettingsValues> = [
  'uapiKey',
  'steamWebApiKey',
  'kookBotToken',
];

function normalizeSettings(values: SettingsValues) {
  return {
    publishTakeoverEnabled: Boolean(values.publishTakeoverEnabled),
    uapiKey: values.uapiKey?.trim() || '',
    steamWebApiKey: values.steamWebApiKey?.trim() || '',
    kookBotToken: values.kookBotToken?.trim() || '',
    kookGuildId: values.kookGuildId?.trim() || '',
  };
}

export default function Settings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [initialValues, setInitialValues] = useState<SettingsValues>({});
  const { message, modal } = AntApp.useApp();

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
    const changedSensitiveKeys = sensitiveKeys.filter((key) => next[key] !== previous[key]);
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

  return (
    <>
      <PageHeader
        title="系统设置"
        description="维护发布开关、Steam 校验和 KOOK 机器人配置。"
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
