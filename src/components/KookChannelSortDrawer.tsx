import {
  Alert,
  App as AntApp,
  Button,
  Drawer,
  Form,
  Segmented,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  EyeOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState, type Key } from 'react';
import {
  getKookChannelSortConfig,
  listKookChannelSortRuns,
  previewKookChannelSort,
  runKookChannelSort,
  updateKookChannelSortConfig,
  type KookChannelSortConfig,
  type KookChannelSortConfigUpdate,
  type KookChannelSortMove,
  type KookChannelSortPlan,
  type KookChannelSortRun,
  type KookChannelSortRunStatus,
} from '../api/admin';

export type KookChannelSortCategory = {
  id: Key;
  name?: string;
  level?: number;
};

type Props = {
  open: boolean;
  categories: KookChannelSortCategory[];
  onClose: () => void;
  onCompleted: () => void | Promise<void>;
};

const weekdayOptions = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  .map((label, index) => ({ value: index + 1, label }));
const monthdayOptions = Array.from({ length: 31 }, (_, index) => ({
  value: index + 1,
  label: `${index + 1} 号`,
}));
const hourOptions = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: `${String(hour).padStart(2, '0')}:00`,
}));
const scheduleOptions = [
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
];

const statusMeta: Record<KookChannelSortRunStatus, { label: string; color: string }> = {
  planning: { label: '规划中', color: 'processing' },
  running: { label: '执行中', color: 'processing' },
  succeeded: { label: '成功', color: 'success' },
  failed: { label: '失败', color: 'error' },
  rollback_failed: { label: '需人工处理', color: 'warning' },
};

export function normalizeKookChannelSortConfig(
  values: KookChannelSortConfigUpdate,
): KookChannelSortConfigUpdate {
  return {
    ...values,
    groupIds: [...new Set(values.groupIds.map(String).filter(Boolean))],
    weekday: values.scheduleType === 'weekly' ? values.weekday : null,
    monthday: values.scheduleType === 'monthly' ? values.monthday : null,
  };
}

function errorMessage(error: unknown) {
  const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (responseMessage) return responseMessage;
  if (error instanceof Error) return error.message;
  return '操作失败';
}

function dateTimeText(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ');
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

function rangeText(start?: string | null, end?: string | null) {
  return `${dateTimeText(start)} 至 ${dateTimeText(end)}`;
}

function StatusTag({ status }: { status: KookChannelSortRunStatus }) {
  const meta = statusMeta[status] || { label: status, color: 'default' };
  return <Tag color={meta.color}>{meta.label}</Tag>;
}

function SortSummary({ config }: { config: KookChannelSortConfig }) {
  const latest = config.latestRun;
  return (
    <section className="kook-sort-summary" aria-label="自动排序摘要">
      <div>
        <span>自动任务</span>
        <strong>{config.enabled ? '已启用' : '已关闭'}</strong>
      </div>
      <div>
        <span>下次执行</span>
        <strong>{config.enabled ? dateTimeText(config.nextRunAt) : '-'}</strong>
      </div>
      <div>
        <span>最近执行</span>
        <strong>{latest ? <StatusTag status={latest.status} /> : '-'}</strong>
      </div>
    </section>
  );
}

function locationCell(groupName: string, level: number) {
  return (
    <Space direction="vertical" size={0} className="kook-sort-location">
      <Typography.Text>{groupName || '根级'}</Typography.Text>
      <Typography.Text type="secondary">排序 {level}</Typography.Text>
    </Space>
  );
}

const previewColumns: ColumnsType<KookChannelSortMove> = [
  {
    title: '频道',
    dataIndex: 'channelName',
    width: 190,
    render: (value, row) => (
      <Space direction="vertical" size={0}>
        <Typography.Text>{value || '-'}</Typography.Text>
        <Typography.Text type="secondary" className="mono">{row.channelId}</Typography.Text>
      </Space>
    ),
  },
  {
    title: '当前位置',
    width: 170,
    render: (_, row) => locationCell(row.fromParentName, row.fromLevel),
  },
  {
    title: '目标位置',
    width: 170,
    render: (_, row) => locationCell(row.toParentName, row.toLevel),
  },
  { title: '使用时长', dataIndex: 'usageText', width: 120 },
  { title: '占用时长', dataIndex: 'occupiedDurationText', width: 120 },
];

function SortPreview({ plan }: { plan: KookChannelSortPlan }) {
  return (
    <section className="kook-sort-section" aria-labelledby="kook-sort-preview-title">
      <div className="kook-sort-section-heading">
        <div>
          <Typography.Title level={5} id="kook-sort-preview-title">排序预览</Typography.Title>
          <Typography.Text type="secondary">
            {rangeText(plan.range.startTime, plan.range.endTime)}
          </Typography.Text>
        </div>
        <Tag color={plan.moveCount > 0 ? 'orange' : 'default'}>{plan.moveCount} 个变更</Tag>
      </div>

      <div className="kook-sort-group-order" aria-label="目标分组顺序">
        {plan.groups.map((group, index) => (
          <div key={group.groupId}>
            <span>{index + 1}</span>
            <strong>{group.groupName}</strong>
            <small>{group.channelCount} 个频道</small>
          </div>
        ))}
      </div>

      <Table
        size="small"
        rowKey="channelId"
        columns={previewColumns}
        dataSource={plan.moves}
        pagination={false}
        scroll={{ x: 770 }}
        locale={{ emptyText: '当前顺序无需调整' }}
      />
    </section>
  );
}

const runColumns: ColumnsType<KookChannelSortRun> = [
  {
    title: '状态',
    dataIndex: 'status',
    width: 112,
    render: (status: KookChannelSortRunStatus) => <StatusTag status={status} />,
  },
  {
    title: '触发方式',
    dataIndex: 'trigger',
    width: 90,
    render: (trigger: KookChannelSortRun['trigger']) => trigger === 'manual' ? '手动' : '定时',
  },
  {
    title: '统计区间',
    width: 270,
    render: (_, row) => rangeText(row.rangeStart, row.rangeEnd),
  },
  {
    title: '移动',
    width: 100,
    render: (_, row) => `${row.movedCount}/${row.plannedCount}`,
  },
  {
    title: '开始时间',
    dataIndex: 'startedAt',
    width: 160,
    render: dateTimeText,
  },
  {
    title: '错误摘要',
    dataIndex: 'errorMessage',
    width: 180,
    ellipsis: true,
    render: (value) => value ? (
      <Tooltip title={value}>
        <Typography.Text ellipsis>{value}</Typography.Text>
      </Tooltip>
    ) : '-',
  },
];

function RunHistory({ runs }: { runs: KookChannelSortRun[] }) {
  return (
    <section className="kook-sort-section" aria-labelledby="kook-sort-runs-title">
      <div className="kook-sort-section-heading">
        <Typography.Title level={5} id="kook-sort-runs-title">最近执行</Typography.Title>
      </div>
      <Table
        size="small"
        rowKey="id"
        columns={runColumns}
        dataSource={runs}
        pagination={false}
        scroll={{ x: 912 }}
        locale={{ emptyText: '暂无执行记录' }}
      />
    </section>
  );
}

export default function KookChannelSortDrawer({ open, categories, onClose, onCompleted }: Props) {
  const [form] = Form.useForm<KookChannelSortConfigUpdate>();
  const scheduleType = Form.useWatch('scheduleType', form);
  const [config, setConfig] = useState<KookChannelSortConfig | null>(null);
  const [runs, setRuns] = useState<KookChannelSortRun[]>([]);
  const [preview, setPreview] = useState<KookChannelSortPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { message, modal } = AntApp.useApp();

  const categoryOptions = useMemo(() => categories.map((category, index) => ({
    value: String(category.id),
    label: `${index + 1}. ${category.name || category.id}`,
  })), [categories]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [nextConfig, history] = await Promise.all([
        getKookChannelSortConfig(),
        listKookChannelSortRuns({ page: 1, pageSize: 5 }),
      ]);
      setConfig(nextConfig);
      setRuns(history.list);
      form.setFieldsValue(normalizeKookChannelSortConfig(nextConfig));
      setDirty(false);
      setPreview(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    if (open) void loadData();
  }, [loadData, open]);

  const save = async (values: KookChannelSortConfigUpdate) => {
    setSaving(true);
    try {
      const saved = await updateKookChannelSortConfig(normalizeKookChannelSortConfig(values));
      setConfig(saved);
      form.setFieldsValue(normalizeKookChannelSortConfig(saved));
      setDirty(false);
      setPreview(null);
      message.success('自动排序配置已保存');
      await Promise.resolve(onCompleted()).catch(() => message.warning('配置已保存，频道数据刷新失败'));
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const showPreview = async () => {
    setPreviewLoading(true);
    try {
      setPreview(await previewKookChannelSort());
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmRun = async () => {
    setRunning(true);
    try {
      const plan = await previewKookChannelSort();
      setPreview(plan);
      modal.confirm({
        title: '立即执行自动排序？',
        content: (
          <div className="kook-sort-confirm">
            <span>统计区间</span>
            <strong>{rangeText(plan.range.startTime, plan.range.endTime)}</strong>
            <span>预计移动</span>
            <strong>{plan.moveCount} 个频道</strong>
          </div>
        ),
        okText: '确认执行',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onCancel: () => setRunning(false),
        onOk: async () => {
          try {
            const run = await runKookChannelSort();
            await Promise.all([
              loadData(),
              Promise.resolve(onCompleted()).catch(() => message.warning('排序已执行，频道数据刷新失败')),
            ]);
            if (run.status === 'succeeded') {
              message.success(`自动排序完成，已移动 ${run.movedCount} 个频道`);
            } else {
              message.warning(run.errorMessage || '自动排序未成功，请查看执行记录');
            }
          } catch (error) {
            message.error(errorMessage(error));
            throw error;
          } finally {
            setRunning(false);
          }
        },
      });
    } catch (error) {
      setRunning(false);
      message.error(errorMessage(error));
    }
  };

  const mutating = saving || running;
  const controlsDisabled = loading || mutating;
  const operationDisabledReason = loading
    ? '配置正在刷新'
    : dirty
    ? '请先保存当前配置'
    : !config?.groupIds.length
      ? '请先选择并保存目标分组'
      : undefined;

  return (
    <Drawer
      className="kook-sort-drawer"
      title="自动排序设置"
      width={960}
      open={open}
      onClose={() => { if (!mutating) onClose(); }}
      maskClosable={!mutating}
      keyboard={!mutating}
      extra={(
        <Tooltip title="刷新配置和执行记录">
          <Button
            type="text"
            aria-label="刷新配置和执行记录"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void loadData()}
          />
        </Tooltip>
      )}
      footer={config && !loadError ? (
        <div className="kook-sort-footer">
          <div>
            <Tooltip title={operationDisabledReason}>
              <span>
                <Button
                  icon={<EyeOutlined />}
                  disabled={!!operationDisabledReason}
                  loading={previewLoading}
                  onClick={() => void showPreview()}
                >
                  预览排序
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={operationDisabledReason}>
              <span>
                <Button
                  danger
                  icon={<PlayCircleOutlined />}
                  disabled={!!operationDisabledReason}
                  loading={running}
                  onClick={() => void confirmRun()}
                >
                  立即执行
                </Button>
              </span>
            </Tooltip>
          </div>
          <div>
            <Button disabled={mutating} onClick={onClose}>关闭</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              form="kook-sort-config-form"
              htmlType="submit"
              disabled={!dirty || controlsDisabled}
              loading={saving}
            >
              保存配置
            </Button>
          </div>
        </div>
      ) : null}
    >
      {loading && !config ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : loadError ? (
        <Alert
          type="error"
          showIcon
          message="自动排序配置加载失败"
          description={loadError}
          action={<Button icon={<ReloadOutlined />} onClick={() => void loadData()}>重试</Button>}
        />
      ) : config ? (
        <div className="kook-sort-content">
          <SortSummary config={config} />

          <section className="kook-sort-section" aria-labelledby="kook-sort-config-title">
            <div className="kook-sort-section-heading">
              <Typography.Title level={5} id="kook-sort-config-title">调度配置</Typography.Title>
            </div>
            <Form
              id="kook-sort-config-form"
              form={form}
              layout="vertical"
              disabled={controlsDisabled}
              onFinish={save}
              onValuesChange={() => {
                setDirty(true);
                setPreview(null);
              }}
            >
              <div className="kook-sort-form-grid">
                <Form.Item label="启用自动排序" name="enabled" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item label="执行小时" name="hour" rules={[{ required: true, message: '请选择执行小时' }]}>
                  <Select options={hourOptions} />
                </Form.Item>
                <Form.Item
                  className="kook-sort-form-full"
                  label={(
                    <Space size={4}>
                      目标分组
                      <Tooltip title="每次按 KOOK 当前分组顺序分配，每组 15 个，最后一组接收剩余频道">
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </Space>
                  )}
                  name="groupIds"
                  dependencies={['enabled']}
                  rules={[
                    ({ getFieldValue }) => ({
                      validator: (_, value: string[]) => (
                        !getFieldValue('enabled') || value?.length
                          ? Promise.resolve()
                          : Promise.reject(new Error('启用自动排序时至少选择一个分组'))
                      ),
                    }),
                  ]}
                >
                  <Select
                    mode="multiple"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    maxTagCount="responsive"
                    placeholder={categoryOptions.length ? '选择参与排序的分组' : '暂无可用分组'}
                    options={categoryOptions}
                    disabled={!categoryOptions.length || controlsDisabled}
                  />
                </Form.Item>
                <Form.Item label="执行周期" name="scheduleType" rules={[{ required: true, message: '请选择执行周期' }]}>
                  <Segmented block options={scheduleOptions} />
                </Form.Item>
                {scheduleType === 'weekly' && (
                  <Form.Item label="每周日期" name="weekday" rules={[{ required: true, message: '请选择每周执行日' }]}>
                    <Select options={weekdayOptions} />
                  </Form.Item>
                )}
                {scheduleType === 'monthly' && (
                  <Form.Item
                    label={(
                      <Space size={4}>
                        每月日期
                        <Tooltip title="选择 29 至 31 号时，短月在当月最后一天执行">
                          <QuestionCircleOutlined />
                        </Tooltip>
                      </Space>
                    )}
                    name="monthday"
                    rules={[{ required: true, message: '请选择每月执行日' }]}
                  >
                    <Select options={monthdayOptions} />
                  </Form.Item>
                )}
              </div>
            </Form>
          </section>

          {preview && <SortPreview plan={preview} />}
          <RunHistory runs={runs} />
        </div>
      ) : null}
    </Drawer>
  );
}
