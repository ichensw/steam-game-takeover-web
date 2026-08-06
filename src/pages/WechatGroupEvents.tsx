import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { App as AntApp, Button, Space, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { listWechatGroupMemberEvents, type Pagination, type WechatGroupMemberEvent } from '../api/wechatBot';
import PageHeader from '../components/PageHeader';
import { pageSizeOptions } from '../utils/pagination';
import { formatWechatTime } from '../utils/wechatBot';

const defaultPage: Pagination = { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 };

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

  const load = async (page = pagination.page, pageSize = pagination.pageSize) => {
    if (!decodedRoomId) return;
    setLoading(true);
    try {
      const result = await listWechatGroupMemberEvents(decodedRoomId, { page, pageSize, fast: 1 });
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

  const columns = useMemo<ColumnsType<WechatGroupMemberEvent>>(() => [
    { title: '时间', dataIndex: 'createdAt', width: 180, render: formatWechatTime },
    { title: '事件', dataIndex: 'action', width: 110, render: (value) => <Tag color={value === 'join' ? 'green' : 'orange'}>{value === 'join' ? '进群' : '退群'}</Tag> },
    {
      title: '成员',
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{row.memberName || '-'}</Typography.Text>
          <Typography.Text type="secondary" className="mono" copyable={{ text: row.memberWxid }}>{row.memberWxid || '-'}</Typography.Text>
        </Space>
      ),
    },
    { title: '事件后人数', dataIndex: 'memberCount', width: 120, render: (value) => value ?? '-' },
    {
      title: '原始数据',
      dataIndex: 'rawPayload',
      ellipsis: true,
      render: (value) => <Tooltip title={value}><Typography.Text className="mono" ellipsis style={{ maxWidth: 360 }}>{value || '-'}</Typography.Text></Tooltip>,
    },
  ], []);

  return (
    <>
      <PageHeader
        title="进出记录"
        description={roomName}
        extra={(
          <Space>
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
        scroll={{ x: 900 }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.totalItems,
          pageSizeOptions,
          showSizeChanger: true,
          onChange: (page, pageSize) => void load(page, pageSize),
          showTotal: (count) => `共 ${count} 条`,
        }}
      />
    </>
  );
}
