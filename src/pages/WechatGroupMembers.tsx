import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { App as AntApp, Button, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { listWechatGroupMembers, type Pagination, type WechatGroupMember } from '../api/wechatBot';
import PageHeader from '../components/PageHeader';
import { pageSizeOptions } from '../utils/pagination';
import { formatWechatTime } from '../utils/wechatBot';

const defaultPage: Pagination = { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 };

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

  const load = async (page = pagination.page, pageSize = pagination.pageSize) => {
    if (!decodedRoomId) return;
    setLoading(true);
    try {
      const result = await listWechatGroupMembers(decodedRoomId, { page, pageSize, fast: 1 });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedRoomId]);

  const columns = useMemo<ColumnsType<WechatGroupMember>>(() => [
    {
      title: '成员',
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{row.displayName || '-'}</Typography.Text>
          <Typography.Text type="secondary" className="mono" copyable={{ text: row.memberWxid }}>{row.memberWxid}</Typography.Text>
        </Space>
      ),
    },
    { title: '消息数', dataIndex: 'messageCount', width: 110 },
    { title: '首次发言', dataIndex: 'firstMessageAt', width: 180, render: formatWechatTime },
    { title: '最后发言', dataIndex: 'lastMessageAt', width: 180, render: formatWechatTime },
  ], []);

  return (
    <>
      <PageHeader
        title="群成员"
        description={roomName}
        extra={(
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/wechat-groups')}>返回群列表</Button>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>刷新</Button>
          </Space>
        )}
      />
      <Table
        rowKey="memberWxid"
        loading={loading}
        columns={columns}
        dataSource={items}
        scroll={{ x: 760 }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.totalItems,
          pageSizeOptions,
          showSizeChanger: true,
          onChange: (page, pageSize) => void load(page, pageSize),
          showTotal: (count) => `约 ${count} 人`,
        }}
      />
    </>
  );
}
