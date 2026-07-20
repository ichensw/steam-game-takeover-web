import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  App as AntApp,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { useEffect, useState } from 'react';
import {
  banUser,
  batchPublishWhitelist,
  batchTakeoverView,
  getUser,
  listUsers,
  penalizeUserCredit,
  restoreUserCredit,
  unbanUser,
} from '../api/admin';
import PageHeader from '../components/PageHeader';
import StatusTag from '../components/StatusTag';
import { useTableColumnSettings } from '../components/tableColumnSettings';
import { pageSizeOptions, responsePageSize } from '../utils/pagination';

type UserRow = Record<string, unknown> & {
  id: React.Key;
  nickname?: string;
  openid?: string;
  steamId?: string;
  avatarUrl?: string;
  isBanned?: boolean;
  banReason?: string;
  bannedAt?: string;
  publishWhitelisted?: boolean;
  canViewAllTakeovers?: boolean;
  creditScore?: number;
  creditStatus?: string;
};

const renderCreditStatus = (value: unknown) => {
  const status = String(value || 'normal');
  if (status === 'disabled') return <Tag color="red">禁用</Tag>;
  if (status === 'limited') return <Tag color="orange">受限</Tag>;
  return <Tag color="green">正常</Tag>;
};

export default function Users() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<{ field?: string; order?: string }>({
    field: 'createdAt',
    order: 'desc',
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [detail, setDetail] = useState<UserRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [banTarget, setBanTarget] = useState<UserRow | null>(null);
  const [penaltyTarget, setPenaltyTarget] = useState<UserRow | null>(null);
  const [form] = Form.useForm();
  const [banForm] = Form.useForm<{ reason: string }>();
  const [penaltyForm] = Form.useForm<{ penaltyScore: number; reason?: string }>();
  const { message } = AntApp.useApp();

  const buildParams = (
    targetPage: number,
    targetPageSize: number,
    nextSort: { field?: string; order?: string } = sort,
  ) => {
    const values = form.getFieldsValue();
    return {
      page: targetPage,
      pageSize: targetPageSize,
      keyword: values.keyword,
      status: values.status,
      sortField: values.sortField || nextSort.field,
      sortOrder: values.sortOrder || nextSort.order,
    };
  };

  const load = async (targetPage = page, targetPageSize = pageSize, nextSort = sort) => {
    setLoading(true);
    try {
      const res = await listUsers(buildParams(targetPage, targetPageSize, nextSort));
      setRows((res.list || res.items || []) as UserRow[]);
      setTotal(res.total || 0);
      setPage(targetPage);
      setPageSize(responsePageSize(res, targetPageSize));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (id: React.Key) => {
    setDetailLoading(true);
    setDetail({ id });
    try {
      setDetail((await getUser(id)) as UserRow);
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshAfterAction = async (text: string) => {
    message.success(text);
    setDetail(null);
    setSelectedRowKeys([]);
    await load();
  };

  const submitBan = async () => {
    if (!banTarget) return;
    const values = await banForm.validateFields();
    await banUser(banTarget.id, values.reason || '');
    setBanTarget(null);
    banForm.resetFields();
    refreshAfterAction('用户已封禁');
  };

  const submitPenalty = async () => {
    if (!penaltyTarget) return;
    const values = await penaltyForm.validateFields();
    await penalizeUserCredit(penaltyTarget.id, {
      penaltyScore: Number(values.penaltyScore),
      reason: values.reason || '',
    });
    setPenaltyTarget(null);
    penaltyForm.resetFields();
    refreshAfterAction('信誉分已扣除');
  };

  const addWhitelist = async () => {
    const selectedKeySet = new Set(selectedRowKeys.map(String));
    const openids = rows
      .filter((row) => selectedKeySet.has(String(row.id)))
      .map((row) => row.openid)
      .filter((value): value is string => Boolean(value?.trim()))
      .map((value) => value.trim());
    if (openids.length === 0) {
      message.warning('请选择有 openid 的用户');
      return;
    }
    const res = await batchPublishWhitelist(openids);
    message.success(`已加白 ${res.count} 个用户`);
    setSelectedRowKeys([]);
    load();
  };

  const setTakeoverView = async (canViewAllTakeovers: boolean) => {
    const userIds = selectedRowKeys.map(Number).filter(Boolean);
    if (userIds.length === 0) {
      message.warning('请选择用户');
      return;
    }
    const res = await batchTakeoverView(userIds, canViewAllTakeovers);
    message.success(`${canViewAllTakeovers ? '已开放' : '已关闭'} ${res.count} 个用户查看全部接龙`);
    setSelectedRowKeys([]);
    load();
  };

  const onTableChange = (
    pagination: TablePaginationConfig,
    _filters: unknown,
    sorter: SorterResult<UserRow> | SorterResult<UserRow>[],
  ) => {
    const singleSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    const field = (singleSorter?.field as string) || 'createdAt';
    const nextSort = {
      field,
      order: singleSorter?.order === 'ascend' ? 'asc' : 'desc',
    };
    form.setFieldsValue({ sortField: nextSort.field, sortOrder: nextSort.order });
    setSort(nextSort);
    load(pagination.current || 1, pagination.pageSize || pageSize, nextSort);
  };

  const reset = () => {
    form.resetFields();
    setSort({ field: 'createdAt', order: 'desc' });
    setTimeout(() => load(1), 0);
  };

  const columns: ColumnsType<UserRow> = [
    { title: '用户ID', dataIndex: 'id', width: 100, className: 'mono', sorter: true },
    { title: '昵称', dataIndex: 'nickname', width: 160, sorter: true },
    { title: 'openid', dataIndex: 'openid', ellipsis: true, className: 'mono' },
    { title: 'SteamID', dataIndex: 'steamId', width: 150, className: 'mono', sorter: true },
    {
      title: '发布白名单',
      dataIndex: 'publishWhitelisted',
      width: 120,
      render: (value) => (value ? <Tag color="green">已加白</Tag> : <Tag>未加白</Tag>),
      sorter: true,
    },
    {
      title: '查看全部接龙',
      dataIndex: 'canViewAllTakeovers',
      width: 130,
      render: (value) => (value ? <Tag color="blue">已开放</Tag> : <Tag>未开放</Tag>),
    },
    {
      title: '封禁',
      dataIndex: 'isBanned',
      width: 100,
      render: (value) => (value ? <Tag color="red">已封禁</Tag> : <Tag color="green">正常</Tag>),
      sorter: true,
    },
    {
      title: '信誉分',
      dataIndex: 'creditScore',
      width: 110,
      className: 'mono',
      sorter: true,
    },
    { title: '状态', dataIndex: 'creditStatus', width: 110, render: renderCreditStatus },
    {
      title: '操作',
      width: 240,
      fixed: 'right',
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => openDetail(row.id)}>
            详情
          </Button>
          {row.isBanned ? (
            <Popconfirm
              title="解除封禁"
              description="确认解除该用户封禁？"
              okText="解封"
              cancelText="取消"
              onConfirm={() => unbanUser(row.id).then(() => refreshAfterAction('用户已解封'))}
            >
              <Button size="small">解封</Button>
            </Popconfirm>
          ) : (
            <Button size="small" danger onClick={() => setBanTarget(row)}>
              封禁
            </Button>
          )}
          <Button size="small" danger onClick={() => {
            setPenaltyTarget(row);
            penaltyForm.setFieldsValue({ penaltyScore: 10, reason: '' });
          }}>
            扣分
          </Button>
          <Popconfirm
            title="恢复信誉分"
            description="确认将该用户信誉分恢复到 100？"
            okText="恢复"
            cancelText="取消"
            onConfirm={() =>
              restoreUserCredit(row.id).then(() => refreshAfterAction('信誉分已恢复'))
            }
          >
            <Button size="small">恢复信誉</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  const tableColumns = useTableColumnSettings('users', columns);

  return (
    <>
      <PageHeader
        title="用户管理"
        description="查询小程序用户、白名单、封禁和信誉状态。"
        extra={
          <Space>
            {tableColumns.button}
            <Button disabled={!selectedRowKeys.length} onClick={() => setTakeoverView(true)}>
              开放查看全部接龙
            </Button>
            <Button disabled={!selectedRowKeys.length} onClick={() => setTakeoverView(false)}>
              关闭查看全部接龙
            </Button>
            <Button type="primary" disabled={!selectedRowKeys.length} onClick={addWhitelist}>
              批量加发布白名单
            </Button>
          </Space>
        }
      />
      <Card className="filter-card">
        <Form form={form} layout="inline" onFinish={() => load(1)}>
          <Form.Item name="keyword">
            <Input.Search placeholder="昵称 / openid / SteamID" allowClear />
          </Form.Item>
          <Form.Item name="status">
            <Select
              placeholder="封禁状态"
              allowClear
              style={{ width: 130 }}
              options={[
                { value: 'normal', label: '正常' },
                { value: 'banned', label: '已封禁' },
              ]}
            />
          </Form.Item>
          <Form.Item name="sortField">
            <Select
              placeholder="排序字段"
              allowClear
              style={{ width: 150 }}
              options={[
                { value: 'createdAt', label: '创建时间' },
                { value: 'creditScore', label: '信誉分' },
                { value: 'publishWhitelisted', label: '发布白名单' },
              ]}
            />
          </Form.Item>
          <Form.Item name="sortOrder">
            <Select
              placeholder="排序"
              allowClear
              style={{ width: 120 }}
              options={[
                { value: 'desc', label: '倒序' },
                { value: 'asc', label: '正序' },
              ]}
            />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
            <Button onClick={reset}>重置</Button>
          </Space>
        </Form>
      </Card>
      <Table
        rowKey={(row) => String(row.id)}
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        loading={loading}
        columns={tableColumns.columns}
        dataSource={rows}
        onChange={onTableChange}
        scroll={{ x: tableColumns.scrollX }}
        pagination={{
          total,
          current: page,
          pageSize,
          pageSizeOptions,
          showSizeChanger: true,
          showTotal: (n) => `共 ${n} 条`,
        }}
      />
      <Drawer
        title="用户详情"
        width={620}
        open={!!detail}
        onClose={() => setDetail(null)}
        loading={detailLoading}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="用户ID">
              <span className="mono">{detail.id}</span>
            </Descriptions.Item>
            <Descriptions.Item label="昵称">{detail.nickname || '-'}</Descriptions.Item>
            <Descriptions.Item label="openid">
              <span className="mono">{detail.openid || '-'}</span>
            </Descriptions.Item>
            <Descriptions.Item label="SteamID">
              <span className="mono">{detail.steamId || '-'}</span>
            </Descriptions.Item>
            <Descriptions.Item label="发布白名单">
              {detail.publishWhitelisted ? <Tag color="green">已加白</Tag> : <Tag>未加白</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="查看全部接龙">
              {detail.canViewAllTakeovers ? <Tag color="blue">已开放</Tag> : <Tag>未开放</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="封禁状态">
              {detail.isBanned ? <Tag color="red">已封禁</Tag> : <Tag color="green">正常</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="封禁原因">
              {detail.banReason || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="封禁时间">
              <span className="mono">{detail.bannedAt || '-'}</span>
            </Descriptions.Item>
            <Descriptions.Item label="信誉分">
              <span className="mono">{detail.creditScore ?? '-'}</span>
            </Descriptions.Item>
            <Descriptions.Item label="信誉状态">
              {renderCreditStatus(detail.creditStatus)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
      <Modal
        title="封禁用户"
        open={!!banTarget}
        okText="确认封禁"
        okButtonProps={{ danger: true }}
        cancelText="取消"
        onOk={submitBan}
        onCancel={() => {
          setBanTarget(null);
          banForm.resetFields();
        }}
      >
        <Form form={banForm} layout="vertical">
          <Form.Item
            label="封禁原因"
            name="reason"
            rules={[{ max: 255, message: '封禁原因最多 255 字' }]}
          >
            <Input.TextArea rows={4} placeholder="选填，后台留痕用" showCount maxLength={255} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="扣除信誉分"
        open={!!penaltyTarget}
        okText="确认扣分"
        okButtonProps={{ danger: true }}
        cancelText="取消"
        onOk={submitPenalty}
        onCancel={() => {
          setPenaltyTarget(null);
          penaltyForm.resetFields();
        }}
      >
        <p>
          {penaltyTarget?.nickname || penaltyTarget?.steamId || penaltyTarget?.id || '-'} 当前信誉分：
          <span className="mono">{penaltyTarget?.creditScore ?? '-'}</span>
        </p>
        <Form form={penaltyForm} layout="vertical">
          <Form.Item
            label="扣除信誉分"
            name="penaltyScore"
            rules={[{ required: true, message: '请输入扣分' }]}
          >
            <InputNumber min={1} max={100} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="扣分原因"
            name="reason"
            rules={[{ max: 255, message: '扣分原因最多 255 字' }]}
          >
            <Input.TextArea rows={3} placeholder="选填，后台留痕用" showCount maxLength={255} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
