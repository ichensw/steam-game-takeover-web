import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { App as AntApp, Avatar, Button, Input, Space, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { listWechatGroupMemberEvents, type Pagination, type WechatGroupMemberEvent } from '../api/wechatBot';
import PageHeader from '../components/PageHeader';
import { pageSizeOptions } from '../utils/pagination';
import { formatWechatTime } from '../utils/wechatBot';

const defaultPage: Pagination = { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 };

function compactText(value?: string) {
  const text = String(value || '').trim();
  return text || '-';
}

function sexLabel(value?: number) {
  if (value === 1) return '男';
  if (value === 2) return '女';
  return '-';
}

function regionText(row: WechatGroupMemberEvent) {
  return [row.country, row.province, row.city].map((item) => String(item || '').trim()).filter(Boolean).join(' / ') || '-';
}

function actorText(row: WechatGroupMemberEvent, wxidKey: 'inviterWxid' | 'operatorWxid', nameKey: 'inviterName' | 'operatorName') {
  const details = row.rawDetails || {};
  const name = details[nameKey];
  const wxid = details[wxidKey];
  if (!name && !wxid) return '-';
  return (
    <Space direction="vertical" size={0}>
      <Typography.Text>{compactText(name)}</Typography.Text>
      {wxid ? <Typography.Text type="secondary" className="mono" copyable={{ text: wxid }}>{wxid}</Typography.Text> : null}
    </Space>
  );
}

export default function WechatGroupEvents() {
  const navigate = useNavigate();
  const { roomId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { message } = AntApp.useApp();
  const decodedRoomId = decodeURIComponent(roomId);
  const roomName = searchParams.get('roomName') || decodedRoomId;
  const [items, setItems] = useState<WechatGroupMemberEvent[]>([]);
  const [pagination, setPagination] = useState<Pagination>(defaultPage);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  const load = async (page = pagination.page, pageSize = pagination.pageSize, nextKeyword = keyword) => {
    if (!decodedRoomId) return;
    const trimmedKeyword = nextKeyword.trim();
    setLoading(true);
    try {
      const result = await listWechatGroupMemberEvents(decodedRoomId, {
        page,
        pageSize,
        keyword: trimmedKeyword || undefined,
      });
      setItems(result.data || []);
      setPagination(result.pagination || { page, pageSize, totalItems: result.data?.length || 0, totalPages: 1 });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '进出群记录加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1, defaultPage.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedRoomId]);

  const searchEvents = (value: string) => {
    const trimmed = value.trim();
    setKeyword(trimmed);
    void load(1, pagination.pageSize, trimmed);
  };

  const columns = useMemo<ColumnsType<WechatGroupMemberEvent>>(() => [
    { title: '时间', dataIndex: 'createdAt', width: 180, render: formatWechatTime },
    { title: '事件', dataIndex: 'action', width: 110, render: (value) => <Tag color={value === 'join' ? 'green' : 'orange'}>{value === 'join' ? '进群' : '退群'}</Tag> },
    {
      title: '成员',
      fixed: 'left',
      width: 300,
      render: (_, row) => (
        <Space size={10} align="start">
          <Avatar src={row.smallHeadImgUrl || row.bigHeadImgUrl} size={36}>{(row.memberRoomName || row.memberName || row.memberWxid || '?').slice(0, 1)}</Avatar>
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{compactText(row.memberRoomName)}</Typography.Text>
            <Typography.Text type="secondary">{compactText(row.memberName)}</Typography.Text>
            <Typography.Text type="secondary" className="mono" copyable={{ text: row.memberWxid }}>{row.memberWxid || '-'}</Typography.Text>
          </Space>
        </Space>
      ),
    },
    { title: '微信号', dataIndex: 'alias', width: 150, render: compactText },
    { title: '备注', dataIndex: 'remark', width: 140, render: compactText },
    { title: '性别', dataIndex: 'sex', width: 80, render: sexLabel },
    { title: '地区', width: 190, render: (_, row) => regionText(row) },
    { title: '邀请人', width: 220, render: (_, row) => actorText(row, 'inviterWxid', 'inviterName') },
    { title: '操作者', width: 220, render: (_, row) => actorText(row, 'operatorWxid', 'operatorName') },
    { title: '事件后人数', dataIndex: 'memberCount', width: 120, render: (value) => value ?? '-' },
    { title: '资料同步时间', dataIndex: 'profileSyncedAt', width: 170, render: (value) => value || '-' },
    {
      title: '原始摘要',
      dataIndex: 'rawPayload',
      width: 220,
      ellipsis: true,
      render: (_, row) => {
        const details = row.rawDetails || {};
        const summary = [
          details.rawRoomName,
          details.rawMemberRoomName,
          details.rawMemberName,
          details.eventType,
        ].filter(Boolean).join(' / ');
        return <Tooltip title={row.rawPayload || summary}><Typography.Text className="mono" ellipsis style={{ maxWidth: 200 }}>{summary || '-'}</Typography.Text></Tooltip>;
      },
    },
  ], []);

  return (
    <>
      <PageHeader
        title="进出记录"
        description={roomName}
        extra={(
          <Space wrap>
            <Input.Search
              allowClear
              aria-label="搜索进出记录"
              placeholder="搜索 wxid / 群昵称 / 微信昵称"
              enterButton="搜索"
              value={keyword}
              onChange={(event) => {
                const value = event.target.value;
                setKeyword(value);
                if (!value) {
                  void load(1, pagination.pageSize, '');
                }
              }}
              onSearch={searchEvents}
              style={{ width: 300 }}
            />
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/wechat-groups')}>返回群列表</Button>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>刷新</Button>
          </Space>
        )}
      />
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        scroll={{ x: 2100 }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.totalItems,
          pageSizeOptions,
          showSizeChanger: true,
          onChange: (page, pageSize) => void load(page, pageSize, keyword),
          showTotal: (count) => `共 ${count} 条`,
        }}
      />
    </>
  );
}
