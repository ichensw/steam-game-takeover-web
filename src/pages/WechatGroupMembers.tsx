import { ArrowLeftOutlined, ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import { App as AntApp, Avatar, Button, Input, Popconfirm, Space, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  getWechatGroupMemberProfileSyncStatus,
  listWechatGroupMembers,
  refreshWechatGroupMemberProfile,
  startWechatGroupMemberProfileSync,
  type Pagination,
  type WechatGroupMember,
  type WechatGroupMemberProfileSyncState,
} from '../api/wechatBot';
import PageHeader from '../components/PageHeader';
import { pageSizeOptions } from '../utils/pagination';

const defaultPage: Pagination = { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 };
const syncStatusLabel: Record<string, string> = {
  idle: '未同步',
  running: '同步中',
  failed: '失败',
  succeeded: '完成',
};
const syncStatusColor: Record<string, string> = {
  running: 'processing',
  failed: 'red',
  succeeded: 'green',
};

function compactText(value?: string) {
  const text = String(value || '').trim();
  return text || '-';
}

function sexLabel(value?: number) {
  if (value === 1) return '男';
  if (value === 2) return '女';
  return '-';
}

function regionText(row: WechatGroupMember) {
  return [row.country, row.province, row.city].map((item) => String(item || '').trim()).filter(Boolean).join(' / ') || '-';
}

export default function WechatGroupMembers() {
  const navigate = useNavigate();
  const { roomId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { message } = AntApp.useApp();
  const decodedRoomId = decodeURIComponent(roomId);
  const roomName = searchParams.get('roomName') || decodedRoomId;
  const [items, setItems] = useState<WechatGroupMember[]>([]);
  const [pagination, setPagination] = useState<Pagination>(defaultPage);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [refreshingWxid, setRefreshingWxid] = useState('');
  const [syncState, setSyncState] = useState<WechatGroupMemberProfileSyncState | null>(null);
  const [keyword, setKeyword] = useState('');

  const loadSyncState = async () => {
    if (!decodedRoomId) return;
    try {
      setSyncState(await getWechatGroupMemberProfileSyncStatus(decodedRoomId));
    } catch {
      setSyncState(null);
    }
  };

  const load = async (page = pagination.page, pageSize = pagination.pageSize, nextKeyword = keyword) => {
    if (!decodedRoomId) return;
    const trimmedKeyword = nextKeyword.trim();
    setLoading(true);
    try {
      const result = await listWechatGroupMembers(decodedRoomId, {
        page,
        pageSize,
        keyword: trimmedKeyword || undefined,
      });
      setItems(result.data || []);
      setPagination(result.pagination || { page, pageSize, totalItems: result.data?.length || 0, totalPages: 1 });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '成员列表加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1, defaultPage.pageSize);
    void loadSyncState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedRoomId]);

  const searchMembers = (value: string) => {
    const trimmed = value.trim();
    setKeyword(trimmed);
    void load(1, pagination.pageSize, trimmed);
  };

  const startSync = async (mode: 'full' | 'incremental') => {
    setSyncing(true);
    try {
      const state = await startWechatGroupMemberProfileSync(decodedRoomId, mode);
      setSyncState(state);
      message.success(mode === 'full' ? '已开始全量同步群成员资料' : '已开始增量同步群成员资料');
      window.setTimeout(() => {
        void loadSyncState();
        void load(1, pagination.pageSize, keyword);
      }, 1200);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '同步任务启动失败');
    } finally {
      setSyncing(false);
    }
  };

  const refreshProfile = async (memberWxid: string) => {
    setRefreshingWxid(memberWxid);
    try {
      const state = await refreshWechatGroupMemberProfile(decodedRoomId, memberWxid);
      setSyncState(state);
      message.success('已开始刷新成员资料');
      window.setTimeout(() => {
        void loadSyncState();
        void load(pagination.page, pagination.pageSize, keyword);
      }, 1200);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '成员资料刷新失败');
    } finally {
      setRefreshingWxid('');
    }
  };

  const columns = useMemo<ColumnsType<WechatGroupMember>>(() => [
    {
      title: '成员',
      fixed: 'left',
      width: 280,
      render: (_, row) => (
        <Space size={10} align="start">
          <Avatar src={row.smallHeadImgUrl || row.bigHeadImgUrl} size={36}>{(row.displayName || row.nickname || row.memberWxid || '?').slice(0, 1)}</Avatar>
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{compactText(row.displayName)}</Typography.Text>
            <Typography.Text type="secondary">{compactText(row.nickname)}</Typography.Text>
            <Typography.Text type="secondary" className="mono" copyable={{ text: row.memberWxid }}>{row.memberWxid}</Typography.Text>
          </Space>
        </Space>
      ),
    },
    { title: '微信号', dataIndex: 'alias', width: 150, render: compactText },
    { title: '备注', dataIndex: 'remark', width: 140, render: compactText },
    { title: '性别', dataIndex: 'sex', width: 80, render: sexLabel },
    { title: '地区', width: 190, render: (_, row) => regionText(row) },
    {
      title: '签名',
      dataIndex: 'signature',
      width: 260,
      ellipsis: true,
      render: (value) => (
        <Tooltip title={value || ''}>
          <Typography.Text ellipsis style={{ maxWidth: 240 }}>{compactText(value)}</Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: '在群',
      dataIndex: 'isInChatRoom',
      width: 90,
      render: (value) => (value === false ? <Tag>未知/离群</Tag> : value === true ? <Tag color="green">在群</Tag> : <Tag>未知</Tag>),
    },
    { title: '资料同步时间', dataIndex: 'profileSyncedAt', width: 170, render: (value) => value || '-' },
    { title: '群昵称同步时间', dataIndex: 'groupInfoSyncedAt', width: 170, render: (value) => value || '-' },
    {
      title: '同步错误',
      dataIndex: 'profileSyncError',
      width: 180,
      ellipsis: true,
      render: (value) => value ? <Tooltip title={value}><Typography.Text type="danger" ellipsis style={{ maxWidth: 160 }}>{value}</Typography.Text></Tooltip> : '-',
    },
    {
      title: '操作',
      fixed: 'right',
      width: 110,
      render: (_, row) => (
        <Button
          size="small"
          icon={<SyncOutlined />}
          loading={refreshingWxid === row.memberWxid}
          onClick={() => void refreshProfile(row.memberWxid)}
        >
          刷新资料
        </Button>
      ),
    },
  ], [refreshingWxid, pagination.page, pagination.pageSize, keyword]);

  const syncStatus = syncState?.status || 'idle';

  return (
    <>
      <PageHeader
        title="群成员"
        description={roomName}
        extra={(
          <Space wrap>
            <Tag color={syncStatusColor[syncStatus]}>
              {syncStatusLabel[syncStatus] || syncStatus}
              {syncState ? ` ${syncState.processedCount || 0}/${(syncState.processedCount || 0) + (syncState.failedCount || 0)}` : ''}
            </Tag>
            <Input.Search
              allowClear
              aria-label="搜索群成员"
              placeholder="搜索 wxid / 群昵称 / 微信昵称 / 微信号"
              enterButton="搜索"
              value={keyword}
              onChange={(event) => {
                const value = event.target.value;
                setKeyword(value);
                if (!value) {
                  void load(1, pagination.pageSize, '');
                }
              }}
              onSearch={searchMembers}
              style={{ width: 300 }}
            />
            <Button icon={<SyncOutlined />} loading={syncing} onClick={() => void startSync('incremental')}>增量同步</Button>
            <Popconfirm
              title="全量同步群成员资料"
              description="会重新扫描群成员并后台同步资料，群人数较多时需要等待一会。"
              okText="开始同步"
              cancelText="取消"
              onConfirm={() => void startSync('full')}
            >
              <Button icon={<SyncOutlined />} loading={syncing}>全量同步</Button>
            </Popconfirm>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/wechat-groups')}>返回群列表</Button>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => { void load(); void loadSyncState(); }}>刷新</Button>
          </Space>
        )}
      />
      <Table
        rowKey="memberWxid"
        loading={loading}
        columns={columns}
        dataSource={items}
        scroll={{ x: 1850 }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.totalItems,
          pageSizeOptions,
          showSizeChanger: true,
          onChange: (page, pageSize) => void load(page, pageSize, keyword),
          showTotal: (count) => `共 ${count} 人`,
        }}
      />
    </>
  );
}
