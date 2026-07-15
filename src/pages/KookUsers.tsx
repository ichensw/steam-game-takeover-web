import { App as AntApp, AutoComplete, Avatar, Button, Card, Descriptions, Empty, Flex, Form, Space, Tag, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import {
  getKookBotOnlineStatus,
  getKookUser,
  getKookUserMe,
  listKookMembers,
  listKookRoles,
  offlineKookBot,
  onlineKookBot,
} from '../api/admin';
import PageHeader from '../components/PageHeader';
import { formatDateTime } from '../utils/wechatBot';

type KookUser = Record<string, unknown>;
type KookMember = Record<string, unknown>;
type KookRole = Record<string, unknown>;

const fieldLabels: Record<string, string> = {
  id: '用户 ID',
  username: '用户名',
  nickname: '昵称',
  identify_num: '认证号',
  online: '在线状态',
  os: '连接方式',
  status: '账号状态',
  avatar: '头像',
  vip_avatar: 'VIP 头像',
  banner: '横幅',
  roles: '角色',
  is_vip: '会员',
  vip_amp: '年度会员',
  bot: '机器人',
  bot_status: '机器人状态',
  tag_info: '标签信息',
  mobile_verified: '手机号验证',
  is_sys: '系统账号',
  client_id: '客户端 ID',
  verified: '已验证',
  mobile_prefix: '手机区号',
  mobile: '手机号',
  invited_count: '邀请人数',
  intent: '事件订阅',
  joined_at: '加入服务器时间',
  active_time: '活跃时间',
  kpm_vip: 'KPM VIP',
  wealth_level: '语音财富等级',
};

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
  const value = onlineValue(row);
  if (value === true) return <Tag color="green">在线</Tag>;
  if (value === false) return <Tag>离线</Tag>;
  return <Tag>{value ? String(value) : '未知'}</Tag>;
}

function onlineValue(row: KookUser | null) {
  const value = row?.online ?? row?.onlineStatus ?? row?.is_online ?? row?.bot_online ?? row?.status;
  if (value === true || value === 1 || value === '1' || value === 'online') return true;
  if (value === false || value === 0 || value === '0' || value === 'offline') return false;
  return undefined;
}

function userTitle(row: KookUser | null) {
  return text(row, 'nickname') || text(row, 'username') || text(row, 'id') || 'KOOK 用户';
}

function avatarURL(user: KookUser | null) {
  return text(user, 'vip_avatar', 'vipAvatar', 'avatar', 'avatarUrl');
}

function KookAvatar({ user, size = 96, shape = 'circle' }: { user: KookUser | null; size?: number; shape?: 'circle' | 'square' }) {
  const [failed, setFailed] = useState(false);
  const src = avatarURL(user);
  const title = userTitle(user);
  const radius = shape === 'circle' ? '50%' : 8;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        background: '#56585f',
        display: 'grid',
        placeItems: 'center',
        color: '#fff',
        fontSize: Math.max(18, Math.round(size / 3)),
        fontWeight: 700,
      }}
    >
      {src && !failed ? (
        <img
          alt={title}
          referrerPolicy="no-referrer"
          src={src}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        title.slice(0, 1)
      )}
    </div>
  );
}

function roleId(row: KookRole) {
  return text(row, 'role_id', 'roleId', 'id');
}

function roleItems(data: Record<string, unknown>) {
  return ((data.items || data.list || []) as KookRole[]).map((row) => ({ ...row, id: roleId(row) }));
}

function memberUserId(row: KookMember) {
  return text(row, 'kookUserId', 'userId', 'user_id', 'id');
}

function sameMember(row: KookMember, keyword: string) {
  const lower = keyword.toLowerCase();
  return ['kookUserId', 'userId', 'user_id', 'id', 'username', 'nickname', 'identifyNum', 'identify_num'].some(
    (key) => text(row, key).toLowerCase() === lower,
  );
}

function memberLabel(row: KookMember) {
  const name = text(row, 'nickname') || text(row, 'username') || '未命名用户';
  const identifyNum = text(row, 'identifyNum', 'identify_num');
  return `${name}${identifyNum ? `#${identifyNum}` : ''} (${memberUserId(row)})`;
}

function formatTime(value: unknown) {
  return formatDateTime(typeof value === 'number' ? value : String(value));
}

function statusText(value: unknown) {
  const status = Number(value);
  if (status === 0 || status === 1) return <Tag color="green">正常 ({status})</Tag>;
  if (status === 10) return <Tag color="red">封禁 ({status})</Tag>;
  return <Tag>{String(value)}</Tag>;
}

function renderRoles(value: unknown, roleMap: Record<string, KookRole>) {
  const ids = Array.isArray(value) ? value : value ? [value] : [];
  if (!ids.length) return '-';
  return (
    <Space wrap>
      {ids.map((id) => {
        const key = String(id);
        const role = roleMap[key];
        return <Tag key={key}>{role?.name ? `${role.name} (${key})` : key}</Tag>;
      })}
    </Space>
  );
}

function renderValue(key: string, value: unknown, roleMap: Record<string, KookRole>) {
  if (value === undefined || value === null || value === '') return '-';
  if (key === 'roles') return renderRoles(value, roleMap);
  if (key === 'online' || key === 'bot_status') return renderOnline({ online: value });
  if (key === 'status') return statusText(value);
  if (['bot', 'is_vip', 'vip_amp', 'mobile_verified', 'is_sys', 'verified'].includes(key)) return boolText(value);
  if (['joined_at', 'active_time'].includes(key)) return formatTime(value) || String(value);
  if (['avatar', 'vip_avatar', 'banner'].includes(key)) {
    return <Typography.Link href={String(value)} target="_blank">{String(value)}</Typography.Link>;
  }
  if (Array.isArray(value)) return value.length ? value.map((item) => String(item)).join('、') : '-';
  if (typeof value === 'object') {
    return <Typography.Text code>{JSON.stringify(value)}</Typography.Text>;
  }
  return String(value);
}

function orderedEntries(user: KookUser) {
  const first = ['id', 'username', 'nickname', 'identify_num', 'online', 'os', 'status', 'roles'];
  const keys = [...first, ...Object.keys(user).filter((key) => !first.includes(key))];
  return keys.filter((key, index) => keys.indexOf(key) === index && key in user);
}

function UserInfo({ user, roleMap }: { user: KookUser | null; roleMap: Record<string, KookRole> }) {
  if (!user) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无用户信息" />;

  return (
    <Flex gap={18} align="start" wrap>
      <Space direction="vertical" align="center">
        <KookAvatar user={user} />
        {text(user, 'banner') ? <Avatar shape="square" src={text(user, 'banner')} size={96} /> : null}
      </Space>
      <Descriptions column={1} bordered size="small" style={{ flex: 1, minWidth: 260 }}>
        {orderedEntries(user).map((key) => (
          <Descriptions.Item key={key} label={fieldLabels[key] || key}>
            {renderValue(key, user[key], roleMap)}
          </Descriptions.Item>
        ))}
      </Descriptions>
    </Flex>
  );
}

export default function KookUsers() {
  const [bot, setBot] = useState<KookUser | null>(null);
  const [botStatus, setBotStatus] = useState<KookUser | null>(null);
  const [target, setTarget] = useState<KookUser | null>(null);
  const [roleMap, setRoleMap] = useState<Record<string, KookRole>>({});
  const [loadingBot, setLoadingBot] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingTarget, setLoadingTarget] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [memberOptions, setMemberOptions] = useState<{ value: string; label: string }[]>([]);
  const memberSearchTimer = useRef<number | undefined>(undefined);
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

  const loadRoles = async () => {
    try {
      const roles = roleItems(await listKookRoles({ page: 1, pageSize: 100 }));
      setRoleMap(Object.fromEntries(roles.map((role) => [roleId(role), role])));
    } catch {
      setRoleMap({});
    }
  };

  useEffect(() => {
    loadBot();
    loadStatus();
    loadRoles();
    return () => window.clearTimeout(memberSearchTimer.current);
  }, []);

  const searchMemberOptions = (keyword = '') => {
    window.clearTimeout(memberSearchTimer.current);
    memberSearchTimer.current = window.setTimeout(async () => {
      const res = await listKookMembers({ page: 1, pageSize: 10, keyword, isBlacklisted: false });
      setMemberOptions(
        ((res.list || res.items || []) as KookMember[])
          .map((row) => ({ value: memberUserId(row), label: memberLabel(row) }))
          .filter((option) => option.value),
      );
    }, 300);
  };

  const searchUser = async ({ userId }: { userId: string }) => {
    const keyword = userId.trim();
    if (!keyword) return;
    setLoadingTarget(true);
    try {
      let id = keyword;
      const res = await listKookMembers({ page: 1, pageSize: 10, keyword, isBlacklisted: false });
      const members = (res.list || res.items || []) as KookMember[];
      const matched = members.find((row) => sameMember(row, keyword)) || members[0];
      if (matched && memberUserId(matched)) {
        id = memberUserId(matched);
      }
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

  const botOnline = onlineValue(botStatus);

  return (
    <>
      <PageHeader title="KOOK 用户" description="查看 Bot 与目标 KOOK 用户信息，维护 Bot 在线状态。" />
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <Card title="Bot 信息" loading={loadingBot}>
          <UserInfo user={bot} roleMap={roleMap} />
        </Card>
        <Card
          title="Bot 在线状态"
          loading={loadingStatus}
          extra={
            <Space>
              {botOnline !== true && <Button onClick={() => setBotOnline(true)} loading={switching}>上线</Button>}
              {botOnline !== false && <Button danger onClick={() => setBotOnline(false)} loading={switching}>离线</Button>}
            </Space>
          }
        >
          <Space size={16} align="center">
            <KookAvatar user={bot} size={64} />
            <Space direction="vertical" size={8}>
              <Typography.Title level={3} style={{ margin: 0 }}>{renderOnline(botStatus)}</Typography.Title>
              <Typography.Text>{userTitle(bot)}</Typography.Text>
              <Typography.Text type="secondary">状态来源：KOOK user/get-online-status</Typography.Text>
            </Space>
          </Space>
        </Card>
      </div>
      <Card title="查询目标用户" className="filter-card" style={{ marginTop: 16 }} loading={loadingTarget}>
        <Form form={form} layout="inline" onFinish={searchUser}>
          <Form.Item name="userId" rules={[{ required: true, message: '请输入 KOOK 用户 ID' }]}>
            <AutoComplete
              allowClear
              options={memberOptions}
              onSearch={searchMemberOptions}
              placeholder="昵称 / 用户名 / KOOK ID"
              style={{ width: 360 }}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loadingTarget}>查询</Button>
        </Form>
      </Card>
      <Card title={userTitle(target)} style={{ marginTop: 16 }}>
        <UserInfo user={target} roleMap={roleMap} />
      </Card>
    </>
  );
}
