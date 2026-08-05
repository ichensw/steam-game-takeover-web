import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Descriptions, Modal, Select, Space, Switch, Table, Tabs, Tag, Tooltip, Typography, App as AntApp } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import {
  listWechatMessages,
  listWechatGroupMemberEvents,
  listWechatGroupMembers,
  listWechatManagedGroups,
  listWxbots,
  updateWechatGroupWhitelist,
  type Pagination,
  type WechatGroupMember,
  type WechatGroupMemberEvent,
  type WechatManagedGroup,
  type WechatMessage,
  type WxbotRecord,
} from '../api/wechatBot';
import PageHeader from '../components/PageHeader';
import ModalPanel from '../components/ModalPanel';
import { pageSizeOptions } from '../utils/pagination';
import { formatWechatTime } from '../utils/wechatBot';

type DetailTab = 'members' | 'events';

export default function WechatGroups() {
  const [bots, setBots] = useState<WxbotRecord[]>([]);
  const [botId, setBotId] = useState('');
  const [groups, setGroups] = useState<WechatManagedGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<WechatManagedGroup | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('members');
  const [members, setMembers] = useState<WechatGroupMember[]>([]);
  const [events, setEvents] = useState<WechatGroupMemberEvent[]>([]);
  const [selectedMember, setSelectedMember] = useState<WechatGroupMember | null>(null);
  const [memberMessages, setMemberMessages] = useState<WechatMessage[]>([]);
  const [memberPage, setMemberPage] = useState<Pagination>({ page: 1, pageSize: 50, totalItems: 0, totalPages: 0 });
  const [eventPage, setEventPage] = useState<Pagination>({ page: 1, pageSize: 50, totalItems: 0, totalPages: 0 });
  const [detailLoading, setDetailLoading] = useState(false);
  const { message } = AntApp.useApp();

  const loadGroups = async (targetBotId = botId) => {
    setLoading(true);
    try {
      const result = await listWechatManagedGroups(targetBotId ? { botId: targetBotId } : undefined);
      setGroups(result.items || []);
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
    await loadGroups(nextBotId);
  };

  useEffect(() => {
    void loadBots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMembers = async (roomId: string, page = memberPage.page, pageSize = memberPage.pageSize) => {
    setDetailLoading(true);
    try {
      const result = await listWechatGroupMembers(roomId, { page, pageSize });
      setMembers(result.data || []);
      setMemberPage(result.pagination || { page, pageSize, totalItems: 0, totalPages: 0 });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '成员列表加载失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const loadEvents = async (roomId: string, page = eventPage.page, pageSize = eventPage.pageSize) => {
    setDetailLoading(true);
    try {
      const result = await listWechatGroupMemberEvents(roomId, { page, pageSize });
      setEvents(result.data || []);
      setEventPage(result.pagination || { page, pageSize, totalItems: 0, totalPages: 0 });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '进出群记录加载失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = (group: WechatManagedGroup, tab: DetailTab) => {
    setSelectedGroup(group);
    setActiveTab(tab);
    if (tab === 'members') void loadMembers(group.roomId, 1);
    if (tab === 'events') void loadEvents(group.roomId, 1);
  };

  const openMember = async (member: WechatGroupMember) => {
    if (!selectedGroup) return;
    setSelectedMember(member);
    try {
      const result = await listWechatMessages({ roomId: selectedGroup.roomId, sender: member.memberWxid, page: 1, pageSize: 10 });
      setMemberMessages(result.data || []);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '最近消息加载失败');
    }
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
      void loadGroups();
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
            <Button icon={<EyeOutlined />} onClick={() => openDetail(row, 'members')}>成员</Button>
          </Tooltip>
          <Button onClick={() => openDetail(row, 'events')}>进出记录</Button>
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
                void loadGroups(value);
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
          pageSize: 50,
          showSizeChanger: true,
          pageSizeOptions,
          showTotal: (count) => `共 ${count} 个群`,
        }}
      />
      <ModalPanel
        width={860}
        title={selectedGroup?.roomName || selectedGroup?.roomId || '群聊详情'}
        open={Boolean(selectedGroup)}
        onClose={() => setSelectedGroup(null)}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            const tab = key as DetailTab;
            setActiveTab(tab);
            if (selectedGroup && tab === 'members') void loadMembers(selectedGroup.roomId, 1);
            if (selectedGroup && tab === 'events') void loadEvents(selectedGroup.roomId, 1);
          }}
          items={[
            {
              key: 'members',
              label: '成员',
              children: (
                <Table
                  rowKey="memberWxid"
                  size="small"
                  loading={detailLoading}
                  dataSource={members}
                  columns={[
                    { title: '成员', render: (_, row) => <Space direction="vertical" size={0}><span>{row.displayName || '-'}</span><Typography.Text type="secondary" className="mono" copyable={{ text: row.memberWxid }}>{row.memberWxid}</Typography.Text></Space> },
                    { title: '消息数', dataIndex: 'messageCount', width: 90 },
                    { title: '首次发言', dataIndex: 'firstMessageAt', width: 170, render: formatWechatTime },
                    { title: '最后发言', dataIndex: 'lastMessageAt', width: 170, render: formatWechatTime },
                  ]}
                  onRow={(row) => ({ onClick: () => void openMember(row) })}
                  pagination={{
                    current: memberPage.page,
                    pageSize: memberPage.pageSize,
                    total: memberPage.totalItems,
                    pageSizeOptions,
                    showSizeChanger: true,
                    onChange: (page, pageSize) => selectedGroup && void loadMembers(selectedGroup.roomId, page, pageSize),
                    showTotal: (count) => `共 ${count} 人`,
                  }}
                />
              ),
            },
            {
              key: 'events',
              label: '进出记录',
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  loading={detailLoading}
                  dataSource={events}
                  columns={[
                    { title: '时间', dataIndex: 'createdAt', width: 170, render: formatWechatTime },
                    { title: '事件', dataIndex: 'action', width: 90, render: (value) => <Tag color={value === 'join' ? 'green' : 'orange'}>{value === 'join' ? '进群' : '退群'}</Tag> },
                    { title: '成员', render: (_, row) => <Space direction="vertical" size={0}><span>{row.memberName || '-'}</span><Typography.Text type="secondary" className="mono" copyable={{ text: row.memberWxid }}>{row.memberWxid || '-'}</Typography.Text></Space> },
                    { title: '事件后人数', dataIndex: 'memberCount', width: 110, render: (value) => value ?? '-' },
                    { title: '原始数据', dataIndex: 'rawPayload', ellipsis: true, render: (value) => <Tooltip title={value}><Typography.Text className="mono" ellipsis style={{ maxWidth: 260 }}>{value || '-'}</Typography.Text></Tooltip> },
                  ]}
                  pagination={{
                    current: eventPage.page,
                    pageSize: eventPage.pageSize,
                    total: eventPage.totalItems,
                    pageSizeOptions,
                    showSizeChanger: true,
                    onChange: (page, pageSize) => selectedGroup && void loadEvents(selectedGroup.roomId, page, pageSize),
                    showTotal: (count) => `共 ${count} 条`,
                  }}
                />
              ),
            },
          ]}
        />
      </ModalPanel>
      <Modal
        width={760}
        title={selectedMember?.displayName || selectedMember?.memberWxid || '成员详情'}
        open={Boolean(selectedMember)}
        footer={null}
        onCancel={() => {
          setSelectedMember(null);
          setMemberMessages([]);
        }}
      >
        {selectedMember ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="wxid"><Typography.Text className="mono" copyable={{ text: selectedMember.memberWxid }}>{selectedMember.memberWxid}</Typography.Text></Descriptions.Item>
              <Descriptions.Item label="发言次数">{selectedMember.messageCount}</Descriptions.Item>
              <Descriptions.Item label="首次发言">{formatWechatTime(selectedMember.firstMessageAt)}</Descriptions.Item>
              <Descriptions.Item label="最后发言">{formatWechatTime(selectedMember.lastMessageAt)}</Descriptions.Item>
            </Descriptions>
            <Table
              rowKey="msgId"
              size="small"
              dataSource={memberMessages}
              pagination={false}
              columns={[
                { title: '时间', dataIndex: 'createdAt', width: 170, render: formatWechatTime },
                { title: '内容', dataIndex: 'content', ellipsis: true, render: (value) => <Tooltip title={value}><Typography.Text ellipsis>{value || '-'}</Typography.Text></Tooltip> },
              ]}
            />
          </Space>
        ) : null}
      </Modal>
    </>
  );
}
