import {
  App as AntApp,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { RcFile, UploadProps } from 'antd/es/upload/interface';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  approveReport,
  createReport,
  getReport,
  listUsers,
  listReports,
  listTakeovers,
  rejectReport,
  uploadAdminImage,
} from '../api/admin';
import PageHeader from '../components/PageHeader';
import { useTableColumnSettings } from '../components/tableColumnSettings';
import { pageSizeOptions, responsePageSize } from '../utils/pagination';

type DateLike = { format: (template: string) => string };

type ReportRow = Record<string, unknown> & {
  id: React.Key;
  takeoverId?: number;
  takeoverTitle?: string;
  reporterUserId?: number;
  reporterNickname?: string;
  reporterSteamId?: string;
  reportedUserId?: number;
  reportedNickname?: string;
  reportedSteamId?: string;
  reportedCreditScore?: number;
  reportedCreditStatus?: string;
  content?: string;
  imageUrls?: string[];
  state?: number;
  penaltyScore?: number;
  handleNote?: string;
  handledAt?: string;
  createdAt?: string;
};

type MemberRow = Record<string, unknown> & {
  id?: React.Key;
  userId?: React.Key;
  nickname?: string;
  openid?: string;
  steamId?: string;
};

const stateOptions = [
  { value: 'pending', label: '待处理' },
  { value: 'approved', label: '已扣分' },
  { value: 'rejected', label: '已驳回' },
];

const reportTypeOptions = [
  { value: 'no_show', label: '到点不来' },
  { value: 'leave_early', label: '中途跳车' },
  { value: 'disruptive', label: '消极捣乱' },
  { value: 'offensive', label: '言语攻击' },
  { value: 'other', label: '其他' },
];

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const maxImageSize = 5 * 1024 * 1024;
const maxReportImages = 9;

function numberId(value: unknown) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

function memberId(row: MemberRow) {
  return numberId(row.userId || row.id);
}

function memberLabel(row: MemberRow) {
  const id = memberId(row);
  return [
    row.nickname || '未命名用户',
    row.steamId ? `SteamID: ${row.steamId}` : '',
    row.openid ? `openid: ${row.openid}` : '',
    id ? `ID: ${id}` : '',
  ].filter(Boolean).join(' / ');
}

function userOption(row: MemberRow) {
  const id = memberId(row);
  return id ? { value: id, label: memberLabel(row) } : null;
}

function renderState(value: unknown) {
  const state = Number(value);
  if (state === 3) return <Tag color="red">已扣分</Tag>;
  if (state === 2) return <Tag>已驳回</Tag>;
  return <Tag color="orange">待处理</Tag>;
}

function renderCreditStatus(value: unknown) {
  const status = String(value || 'normal');
  if (status === 'disabled') return <Tag color="red">禁用</Tag>;
  if (status === 'limited') return <Tag color="orange">受限</Tag>;
  return <Tag color="green">正常</Tag>;
}

function getErrorMessage(error: unknown) {
  const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (responseMessage) return responseMessage;
  if (error instanceof Error) return error.message;
  return '操作失败';
}

function imageStrip(urls?: string[], size = 44) {
  if (!urls?.length) return '-';
  return (
    <Image.PreviewGroup>
      <div className="feedback-image-strip">
        {urls.map((url) => (
          <Image key={url} src={url} width={size} height={size} />
        ))}
      </div>
    </Image.PreviewGroup>
  );
}

export default function Reports() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<ReportRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [handling, setHandling] = useState(false);
  const [handleTarget, setHandleTarget] = useState<ReportRow | null>(null);
  const [handleMode, setHandleMode] = useState<'approve' | 'reject'>('approve');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [takeoverOptions, setTakeoverOptions] = useState<{ value: number; label: string }[]>([]);
  const [takeoverLoading, setTakeoverLoading] = useState(false);
  const [userOptions, setUserOptions] = useState<{ value: number; label: string; disabled?: boolean }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [form] = Form.useForm();
  const [handleForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const userSearchTimer = useRef<number | undefined>(undefined);
  const { message } = AntApp.useApp();
  const reporterUserId = Form.useWatch('reporterUserId', createForm);
  const reportedUserId = Form.useWatch('reportedUserId', createForm);
  const imageUrls = (Form.useWatch('imageUrls', createForm) as string[] | undefined) || [];

  const buildParams = (targetPage: number, targetPageSize: number) => {
    const values = form.getFieldsValue();
    const range = values.createdRange as DateLike[] | undefined;
    const params: Record<string, string | number | undefined> = {
      page: targetPage,
      pageSize: targetPageSize,
      keyword: values.keyword,
      state: values.state,
    };
    if (range?.length === 2) {
      params.startDate = range[0].format('YYYY-MM-DD');
      params.endDate = range[1].format('YYYY-MM-DD');
    }
    return params;
  };

  const load = async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    try {
      const res = await listReports(buildParams(targetPage, targetPageSize));
      setRows((res.list || res.items || []) as ReportRow[]);
      setTotal(res.total || 0);
      setPage(targetPage);
      setPageSize(responsePageSize(res, targetPageSize));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => window.clearTimeout(userSearchTimer.current), []);

  const openDetail = async (id: React.Key) => {
    setDetailLoading(true);
    setDetail({ id });
    try {
      setDetail((await getReport(id)) as ReportRow);
    } finally {
      setDetailLoading(false);
    }
  };

  const openHandle = (row: ReportRow, mode: 'approve' | 'reject') => {
    setHandleTarget(row);
    setHandleMode(mode);
    handleForm.resetFields();
    handleForm.setFieldsValue({ penaltyScore: 10 });
  };

  const loadTakeoverOptions = async (keyword = '') => {
    setTakeoverLoading(true);
    try {
      const res = await listTakeovers({ page: 1, pageSize: 100, keyword });
      setTakeoverOptions(
        ((res.list || res.items || []) as ReportRow[])
          .map((row) => {
            const id = numberId(row.id);
            return id ? { value: id, label: `${row.takeoverTitle || row.title || `接龙 ${id}`} / ID: ${id}` } : null;
          })
          .filter((item): item is { value: number; label: string } => Boolean(item)),
      );
    } finally {
      setTakeoverLoading(false);
    }
  };

  const searchUsers = async (keyword = '') => {
    setUsersLoading(true);
    try {
      const res = await listUsers({ page: 1, pageSize: 100, keyword });
      const nextOptions = ((res.list || res.items || []) as MemberRow[])
        .map(userOption)
        .filter((option): option is { value: number; label: string } => Boolean(option));
      setUserOptions((current) => {
        const map = new Map<number, { value: number; label: string }>();
        nextOptions.forEach((option) => map.set(option.value, option));
        current.forEach((option) => {
          if (!map.has(option.value)) map.set(option.value, option);
        });
        return Array.from(map.values());
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const debouncedSearchUsers = (keyword: string) => {
    window.clearTimeout(userSearchTimer.current);
    userSearchTimer.current = window.setTimeout(() => searchUsers(keyword), 300);
  };

  const openCreate = () => {
    createForm.resetFields();
    createForm.setFieldsValue({ reportType: 'other', imageUrls: [] });
    setCreateOpen(true);
    loadTakeoverOptions();
    searchUsers();
  };

  const currentReportImageUrls = () => (Array.isArray(createForm.getFieldValue('imageUrls'))
    ? createForm.getFieldValue('imageUrls').map((item: unknown) => String(item).trim()).filter(Boolean)
    : []);

  const submitCreate = async () => {
    const values = await createForm.validateFields();
    const reportImageUrls = currentReportImageUrls();
    setCreating(true);
    try {
      await createReport({
        takeoverId: Number(values.takeoverId),
        reporterUserId: Number(values.reporterUserId),
        reportedUserId: Number(values.reportedUserId),
        reportType: values.reportType || 'other',
        content: values.content || '',
        imageUrls: reportImageUrls,
      });
      message.success('举报已新增');
      setCreateOpen(false);
      await load(1);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const beforeReportImageUpload = (file: RcFile) => {
    if (!allowedImageTypes.includes(file.type)) {
      message.error('仅支持 JPG、PNG、GIF、WebP 图片');
      return Upload.LIST_IGNORE;
    }
    if (file.size > maxImageSize) {
      message.error('图片不能超过 5MB');
      return Upload.LIST_IGNORE;
    }
    if (imageUrls.length >= maxReportImages) {
      message.error(`最多上传 ${maxReportImages} 张图片`);
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const uploadReportImage: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    try {
      if (!(file instanceof File)) {
        throw new Error('请选择有效图片文件');
      }
      setImageUploading(true);
      const result = await uploadAdminImage(file);
      const currentUrls = currentReportImageUrls();
      if (currentUrls.length >= maxReportImages) {
        throw new Error(`最多上传 ${maxReportImages} 张图片`);
      }
      createForm.setFieldValue('imageUrls', [...currentUrls, result.url]);
      onSuccess?.(result);
      message.success('图片已上传');
    } catch (error) {
      const uploadError = error instanceof Error ? error : new Error('图片上传失败');
      onError?.(uploadError);
      message.error(uploadError.message || '图片上传失败');
    } finally {
      setImageUploading(false);
    }
  };

  const removeReportImage = (url: string) => {
    createForm.setFieldValue('imageUrls', imageUrls.filter((item) => item !== url));
  };

  const submitHandle = async () => {
    if (!handleTarget) return;
    const values = await handleForm.validateFields();
    setHandling(true);
    try {
      if (handleMode === 'approve') {
        await approveReport(handleTarget.id, {
          penaltyScore: Number(values.penaltyScore),
          content: values.note || '',
        });
        message.success('举报已通过并扣分');
      } else {
        await rejectReport(handleTarget.id, { reason: values.note || '' });
        message.success('举报已驳回');
      }
      setHandleTarget(null);
      setDetail(null);
      await load(1);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setHandling(false);
    }
  };

  const reset = () => {
    form.resetFields();
    setTimeout(() => load(1), 0);
  };

  const columns: ColumnsType<ReportRow> = [
    { title: 'ID', dataIndex: 'id', width: 80, className: 'mono' },
    { title: '接龙', dataIndex: 'takeoverTitle', width: 180, ellipsis: true },
    { title: '举报人', dataIndex: 'reporterNickname', width: 120, ellipsis: true },
    { title: '被举报人', dataIndex: 'reportedNickname', width: 130, ellipsis: true },
    { title: 'SteamID', dataIndex: 'reportedSteamId', width: 150, className: 'mono', ellipsis: true },
    { title: '信誉分', dataIndex: 'reportedCreditScore', width: 90, className: 'mono' },
    { title: '信誉状态', dataIndex: 'reportedCreditStatus', width: 100, render: renderCreditStatus },
    { title: '举报内容', dataIndex: 'content', ellipsis: true },
    { title: '截图', dataIndex: 'imageUrls', width: 130, render: (urls) => imageStrip(urls as string[] | undefined) },
    { title: '状态', dataIndex: 'state', width: 100, render: renderState },
    { title: '提交时间', dataIndex: 'createdAt', width: 170, className: 'mono' },
    {
      title: '操作',
      width: 210,
      fixed: 'right',
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => openDetail(row.id)}>详情</Button>
          {Number(row.state) === 1 && (
            <>
              <Button size="small" danger onClick={() => openHandle(row, 'approve')}>扣分</Button>
              <Button size="small" onClick={() => openHandle(row, 'reject')}>驳回</Button>
            </>
          )}
        </Space>
      ),
    },
  ];
  const tableColumns = useTableColumnSettings('reports', columns);
  const reporterOptions = useMemo(
    () => userOptions.map((option) => ({ ...option, disabled: option.value === numberId(reportedUserId) })),
    [reportedUserId, userOptions],
  );
  const reportedOptions = useMemo(
    () => userOptions.map((option) => ({ ...option, disabled: option.value === numberId(reporterUserId) })),
    [reporterUserId, userOptions],
  );
  const userSelectProps = {
    allowClear: true,
    filterOption: false,
    loading: usersLoading,
    onFocus: () => searchUsers(),
    onSearch: debouncedSearchUsers,
    optionFilterProp: 'label',
    showSearch: true,
  };

  return (
    <>
      <PageHeader
        title="举报审核"
        description="查看接龙成员举报，审核后扣除信誉分或驳回。"
        extra={
          <Space>
            {tableColumns.button}
            <Button type="primary" onClick={openCreate}>新增举报</Button>
          </Space>
        }
      />
      <Card className="filter-card">
        <Form form={form} layout="inline" onFinish={() => load(1)}>
          <Form.Item name="keyword">
            <Input.Search placeholder="举报内容关键词" allowClear />
          </Form.Item>
          <Form.Item name="state" initialValue="pending">
            <Select placeholder="状态" allowClear style={{ width: 130 }} options={stateOptions} />
          </Form.Item>
          <Form.Item name="createdRange">
            <DatePicker.RangePicker />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">查询</Button>
            <Button onClick={reset}>重置</Button>
          </Space>
        </Form>
      </Card>
      <Table
        rowKey={(row) => String(row.id)}
        loading={loading}
        columns={tableColumns.columns}
        dataSource={rows}
        scroll={{ x: tableColumns.scrollX }}
        pagination={{
          total,
          current: page,
          pageSize,
          pageSizeOptions,
          showSizeChanger: true,
          onChange: load,
          showTotal: (n) => `共 ${n} 条`,
        }}
      />
      <Drawer
        title="举报详情"
        width={760}
        open={!!detail}
        onClose={() => setDetail(null)}
        loading={detailLoading}
        extra={
          detail?.id && Number(detail.state) === 1 ? (
            <Space>
              <Button danger onClick={() => openHandle(detail, 'approve')}>扣分通过</Button>
              <Button onClick={() => openHandle(detail, 'reject')}>驳回</Button>
            </Space>
          ) : null
        }
      >
        {detail && (
          <Space direction="vertical" size={18} className="detail-stack">
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="举报ID"><span className="mono">{detail.id}</span></Descriptions.Item>
              <Descriptions.Item label="状态">{renderState(detail.state)}</Descriptions.Item>
              <Descriptions.Item label="接龙" span={2}>{detail.takeoverTitle || '-'}</Descriptions.Item>
              <Descriptions.Item label="举报人">{detail.reporterNickname || '-'}</Descriptions.Item>
              <Descriptions.Item label="举报人SteamID"><span className="mono">{detail.reporterSteamId || '-'}</span></Descriptions.Item>
              <Descriptions.Item label="被举报人">{detail.reportedNickname || '-'}</Descriptions.Item>
              <Descriptions.Item label="被举报SteamID"><span className="mono">{detail.reportedSteamId || '-'}</span></Descriptions.Item>
              <Descriptions.Item label="被举报人信誉分">{detail.reportedCreditScore ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="信誉状态">{renderCreditStatus(detail.reportedCreditStatus)}</Descriptions.Item>
              <Descriptions.Item label="扣分">{detail.penaltyScore || '-'}</Descriptions.Item>
              <Descriptions.Item label="处理时间"><span className="mono">{detail.handledAt || '-'}</span></Descriptions.Item>
              <Descriptions.Item label="提交时间" span={2}><span className="mono">{detail.createdAt || '-'}</span></Descriptions.Item>
              <Descriptions.Item label="处理说明" span={2}>{detail.handleNote || '-'}</Descriptions.Item>
              <Descriptions.Item label="举报内容" span={2}>
                <Typography.Paragraph>{detail.content || '-'}</Typography.Paragraph>
              </Descriptions.Item>
            </Descriptions>
            <section>
              <Typography.Title level={5}>举报截图</Typography.Title>
              {imageStrip(detail.imageUrls, 128)}
            </section>
          </Space>
        )}
      </Drawer>
      <Modal
        title={handleMode === 'approve' ? '扣分通过举报' : '驳回举报'}
        open={!!handleTarget}
        okText={handleMode === 'approve' ? '确认扣分' : '确认驳回'}
        okButtonProps={{ danger: handleMode === 'approve' }}
        cancelText="取消"
        confirmLoading={handling}
        onOk={submitHandle}
        onCancel={() => setHandleTarget(null)}
      >
        <Form form={handleForm} layout="vertical">
          {handleMode === 'approve' && (
            <Form.Item label="扣除信誉分" name="penaltyScore" rules={[{ required: true, message: '请选择扣分' }]}>
              <InputNumber min={1} max={100} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          )}
          <Form.Item label="处理说明" name="note" rules={[{ max: 500, message: '处理说明最多 500 字' }]}>
            <Input.TextArea rows={4} showCount maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="新增举报"
        open={createOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={creating}
        onOk={submitCreate}
        onCancel={() => setCreateOpen(false)}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item label="接龙" name="takeoverId" rules={[{ required: true, message: '请选择接龙' }]}>
            <Select
              allowClear
              filterOption={false}
              loading={takeoverLoading}
              onFocus={() => loadTakeoverOptions()}
              onSearch={loadTakeoverOptions}
              onChange={(value) => {
                createForm.setFieldsValue({ reporterUserId: undefined, reportedUserId: undefined });
              }}
              options={takeoverOptions}
              placeholder="搜索接龙标题 / ID"
              showSearch
            />
          </Form.Item>
          <Form.Item
            label="举报人"
            name="reporterUserId"
            dependencies={['reportedUserId']}
            rules={[
              { required: true, message: '请选择举报人' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (value && value === getFieldValue('reportedUserId')) {
                    return Promise.reject(new Error('举报人和被举报人不能相同'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <Select
              {...userSelectProps}
              options={reporterOptions}
              placeholder="搜索昵称 / SteamID / openid / 用户ID"
            />
          </Form.Item>
          <Form.Item
            label="被举报人"
            name="reportedUserId"
            dependencies={['reporterUserId']}
            rules={[
              { required: true, message: '请选择被举报人' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (value && value === getFieldValue('reporterUserId')) {
                    return Promise.reject(new Error('举报人和被举报人不能相同'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <Select
              {...userSelectProps}
              options={reportedOptions}
              placeholder="搜索昵称 / SteamID / openid / 用户ID"
            />
          </Form.Item>
          <Form.Item label="举报类型" name="reportType" rules={[{ required: true, message: '请选择举报类型' }]}>
            <Select options={reportTypeOptions} />
          </Form.Item>
          <Form.Item label="举报内容" name="content" rules={[{ required: true, message: '请输入举报内容' }, { max: 500, message: '举报内容最多 500 字' }]}>
            <Input.TextArea rows={4} showCount maxLength={500} />
          </Form.Item>
          <Form.Item label="举报截图">
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              {imageUrls.length > 0 && (
                <Image.PreviewGroup>
                  <Space wrap>
                    {imageUrls.map((url) => (
                      <Space key={url} direction="vertical" size={6}>
                        <Image src={url} width={86} height={86} />
                        <Button size="small" icon={<DeleteOutlined />} onClick={() => removeReportImage(url)}>
                          移除
                        </Button>
                      </Space>
                    ))}
                  </Space>
                </Image.PreviewGroup>
              )}
              <Upload
                accept="image/jpeg,image/png,image/gif,image/webp"
                beforeUpload={beforeReportImageUpload}
                customRequest={uploadReportImage}
                disabled={creating || imageUploading || imageUrls.length >= maxReportImages}
                multiple
                showUploadList={false}
              >
                <Button icon={<UploadOutlined />} loading={imageUploading}>
                  上传图片
                </Button>
              </Upload>
              <Typography.Text type="secondary">支持 JPG、PNG、GIF、WebP，最多 {maxReportImages} 张，单张不超过 5MB。</Typography.Text>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
