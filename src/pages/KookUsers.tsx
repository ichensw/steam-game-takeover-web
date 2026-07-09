import { App as AntApp, Avatar, Button, Card, Descriptions, Empty, Flex, Form, Input, Space, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import {
  getKookBotOnlineStatus,
  getKookUser,
  getKookUserMe,
  offlineKookBot,
  onlineKookBot,
} from '../api/admin';
import PageHeader from '../components/PageHeader';

type KookUser = Record<string, unknown>;

function text(row: KookUser | null, ...keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') return String(value);
  }
  return '';
}

function boolText(value: unknown) {
  if (value === true || value === 1 || value === '1') return '是';
  if (value === false || value === 0 || value === '0') return '否';
  return '-';
}

function renderOnline(row: KookUser | null) {
  const value = row?.online ?? row?.onlineStatus ?? row?.status;
  if (value === true || value === 1 || value === '1' || value === 'online') return <Tag color="green">在线</Tag>;
  if (value === false || value === 0 || value === '0' || value === 'offline') return <Tag>离线</Tag>;
  return <Tag>{value ? String(value) : '未知'}</Tag>;
}

function userTitle(row: KookUser | null) {
  return text(row, 'nickname') || text(row, 'username') || text(row, 'id') || 'KOOK 用户';
}

function UserInfo({ user }: { user: KookUser | null }) {
  if (!user) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无用户信息" />;

  const roles = user.roles;
  const roleText = Array.isArray(roles) ? roles.join('、') : text(user, 'roles');

  return (
    <Flex gap={18} align="start" wrap>
      <Avatar src={text(user, 'avatar', 'avatarUrl', 'vipAvatar', 'vip_avatar')} size={72}>
        {userTitle(user).slice(0, 1)}
      </Avatar>
      <Descriptions column={1} bordered size="small" style={{ flex: 1, minWidth: 260 }}>
        <Descriptions.Item label="用户 ID"><span className="mono">{text(user, 'id', 'userId', 'user_id') || '-'}</span></Descriptions.Item>
        <Descriptions.Item label="用户名">{text(user, 'username') || '-'}</Descriptions.Item>
        <Descriptions.Item label="昵称">{text(user, 'nickname') || '-'}</Descriptions.Item>
        <Descriptions.Item label="认证号"><span className="mono">{text(user, 'identifyNum', 'identify_num') || '-'}</span></Descriptions.Item>
        <Descriptions.Item label="在线状态">{renderOnline(user)}</Descriptions.Item>
        <Descriptions.Item label="机器人">{boolText(user.bot ?? user.isBot ?? user.is_bot)}</Descriptions.Item>
        <Descriptions.Item label="角色">{roleText || '-'}</Descriptions.Item>
      </Descriptions>
    </Flex>
  );
}

export default function KookUsers() {
  const [bot, setBot] = useState<KookUser | null>(null);
  const [botStatus, setBotStatus] = useState<KookUser | null>(null);
  const [target, setTarget] = useState<KookUser | null>(null);
  const [loadingBot, setLoadingBot] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingTarget, setLoadingTarget] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [form] = Form.useForm<{ userId: string }>();
  const { message } = AntApp.useApp();

  const loadBot = async () => {
    setLoadingBot(true);
    try {
      setBot(await getKookUserMe());
    } finally {
      setLoadingBot(false);
    }
  };

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      setBotStatus(await getKookBotOnlineStatus());
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadBot();
    loadStatus();
  }, []);

  const searchUser = async ({ userId }: { userId: string }) => {
    const id = userId.trim();
    if (!id) return;
    setLoadingTarget(true);
    try {
      setTarget(await getKookUser(id));
    } finally {
      setLoadingTarget(false);
    }
  };

  const setBotOnline = async (online: boolean) => {
    setSwitching(true);
    try {
      if (online) {
        await onlineKookBot();
      } else {
        await offlineKookBot();
      }
      message.success(online ? 'Bot 已设为在线' : 'Bot 已设为离线');
      await loadStatus();
    } finally {
      setSwitching(false);
    }
  };

  return (
    <>
      <PageHeader title="KOOK 用户" description="查看 Bot 与目标 KOOK 用户信息，维护 Bot 在线状态。" />
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <Card title="Bot 信息" loading={loadingBot}>
          <UserInfo user={bot} />
        </Card>
        <Card
          title="Bot 在线状态"
          loading={loadingStatus}
          extra={
            <Space>
              <Button onClick={() => setBotOnline(true)} loading={switching}>上线</Button>
              <Button danger onClick={() => setBotOnline(false)} loading={switching}>离线</Button>
            </Space>
          }
        >
          <Space direction="vertical" size={12}>
            <Typography.Title level={3} style={{ margin: 0 }}>{renderOnline(botStatus)}</Typography.Title>
            <Typography.Text type="secondary">状态来源：KOOK user/get-online-status</Typography.Text>
          </Space>
        </Card>
      </div>
      <Card title="查询目标用户" className="filter-card" style={{ marginTop: 16 }} loading={loadingTarget}>
        <Form form={form} layout="inline" onFinish={searchUser}>
          <Form.Item name="userId" rules={[{ required: true, message: '请输入 KOOK 用户 ID' }]}>
            <Input.Search placeholder="KOOK 用户 ID" enterButton="查询" allowClear style={{ width: 360 }} />
          </Form.Item>
        </Form>
      </Card>
      <Card title={userTitle(target)} style={{ marginTop: 16 }}>
        <UserInfo user={target} />
      </Card>
    </>
  );
}
