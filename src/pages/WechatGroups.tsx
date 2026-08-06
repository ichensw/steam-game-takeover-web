import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Select, Space, Switch, Table, Tooltip, Typography, App as AntApp } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listWechatManagedGroups,
  listWxbots,
  updateWechatGroupWhitelist,
  type Pagination,
  type WechatManagedGroup,
  type WxbotRecord,
} from '../api/wechatBot';
import PageHeader from '../components/PageHeader';
import { pageSizeOptions } from '../utils/pagination';
import { formatWechatTime } from '../utils/wechatBot';

export default function WechatGroups() {
  const navigate = useNavigate();
  const [bots, setBots] = useState<WxbotRecord[]>([]);
  const [botId, setBotId] = useState('');
  const [groups, setGroups] = useState<WechatManagedGroup[]>([]);
  const [groupPage, setGroupPage] = useState<Pagination>({ page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const { message } = AntApp.useApp();

  const loadGroups = async (targetBotId = botId, page = groupPage.page, pageSize = groupPage.pageSize) => {
    setLoading(true);
    try {
      const result = await listWechatManagedGroups({ ...(targetBotId ? { botId: targetBotId } : {}), page, pageSize });
      setGroups(result.items || []);
      setGroupPage(result.pagination || { page, pageSize, totalItems: result.items?.length || 0, totalPages: 1 });
      if (!targetBotId && result.botId) setBotId(result.botId);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '群聊列表加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadBots = async () => {
    const result = await listWxbots();
    const list = result.list || [];
    setBots(list);
    const nextBotId = botId || list[0]?.botId || '';
    if (nextBotId) setBotId(nextBotId);
    await loadGroups(nextBotId, 1, groupPage.pageSize);
  };

  useEffect(() => {
    void loadBots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detailLocation = (group: WechatManagedGroup, kind: 'members' | 'events') => {
    const params = new URLSearchParams();
    if (botId) params.set('botId', botId);
    if (group.roomName) params.set('roomName', group.roomName);
    return `/wechat-groups/${encodeURIComponent(group.roomId)}/${kind}?${params.toString()}`;
  };

  const toggleWhitelist = async (group: WechatManagedGroup, type: 'bot' | 'ai', enabled: boolean) => {
    if (!botId) {
      message.warning('请先选择机器人');
      return;
    }
    setGroups((items) => items.map((item) => item.roomId === group.roomId ? {
      ...item,
      botWhitelisted: type === 'bot' ? enabled : item.botWhitelisted,
      aiWhitelisted: type === 'ai' ? enabled : item.aiWhitelisted,
    } : item));
    try {
      await updateWechatGroupWhitelist(group.roomId, { botId, type, enabled });
      message.success('已保存');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '白名单保存失败');
      void loadGroups(botId, groupPage.page, groupPage.pageSize);
    }
  };

  const columns = useMemo<ColumnsType<WechatManagedGroup>>(() => [
    {
      title: '群聊',
      dataIndex: 'roomName',
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{row.roomName || row.roomId}</Typography.Text>
          <Typography.Text type="secondary" className="mono" copyable={{ text: row.roomId }}>{row.roomId}</Typography.Text>
        </Space>
      ),
    },
    { title: '群人数', dataIndex: 'memberCount', width: 90, render: (value) => value || '-' },
    { title: '活跃成员', dataIndex: 'activeMembers', width: 100 },
    { title: '消息数', dataIndex: 'messageCount', width: 100 },
    { title: '最后消息', dataIndex: 'lastMessageAt', width: 180, render: formatWechatTime },
    {
      title: 'Bot 白名单',
      dataIndex: 'botWhitelisted',
      width: 120,
      render: (value, row) => <Switch checked={Boolean(value)} disabled={!botId} onChange={(checked) => void toggleWhitelist(row, 'bot', checked)} />,
    },
    {
      title: 'AI 白名单',
      dataIndex: 'aiWhitelisted',
      width: 120,
      render: (value, row) => <Switch checked={Boolean(value)} disabled={!botId} onChange={(checked) => void toggleWhitelist(row, 'ai', checked)} />,
    },
    {
      title: '查看',
      width: 150,
      render: (_, row) => (
        <Space>
          <Tooltip title="查看成员">
            <Button icon={<EyeOutlined />} onClick={() => navigate(detailLocation(row, 'members'))}>成员</Button>
          </Tooltip>
          <Button onClick={() => navigate(detailLocation(row, 'events'))}>进出记录</Button>
        </Space>
      ),
    },
  ], [botId]);

  return (
    <>
      <PageHeader
        title="微信群管理"
        description="查看机器人已识别的群聊、活跃成员、进出群记录，并维护 Bot 与 AI 的群白名单。"
        extra={(
          <Space>
            <Select
              value={botId || undefined}
              placeholder="选择机器人"
              style={{ width: 220 }}
              options={bots.map((bot) => ({ value: bot.botId, label: bot.name ? `${bot.name} / ${bot.botId}` : bot.botId }))}
              onChange={(value) => {
                setBotId(value);
                void loadGroups(value, 1, groupPage.pageSize);
              }}
            />
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void loadBots()}>刷新</Button>
          </Space>
        )}
      />
      <Table
        rowKey="roomId"
        loading={loading}
        columns={columns}
        dataSource={groups}
        scroll={{ x: 1050 }}
        pagination={{
          current: groupPage.page,
          pageSize: groupPage.pageSize,
          total: groupPage.totalItems,
          showSizeChanger: true,
          pageSizeOptions,
          onChange: (page, pageSize) => void loadGroups(botId, page, pageSize),
          showTotal: (count) => `共 ${count} 个群`,
        }}
      />
    </>
  );
}
