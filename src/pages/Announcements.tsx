import {
  Button,
  Card,
  DatePicker,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  Upload,
  App as AntApp,
} from 'antd';
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import type { RcFile, UploadProps } from 'antd/es/upload/interface';
import { useEffect, useState } from 'react';
import {
  createAnnouncement,
  deleteAnnouncement,
  disableAnnouncement,
  enableAnnouncement,
  getAnnouncement,
  listAnnouncements,
  uploadAnnouncementImage,
  updateAnnouncement,
} from '../api/admin';
import PageHeader from '../components/PageHeader';
import StatusTag from '../components/StatusTag';
import { useTableColumnSettings } from '../components/tableColumnSettings';
import { pageSizeOptions, responsePageSize } from '../utils/pagination';

type AnnouncementRow = Record<string, unknown> & {
  id: React.Key;
  title?: string;
  content?: string;
  image_url?: string;
  status?: number;
  status_label?: string;
  start_time?: string;
  end_time?: string;
  created_at?: string;
};

const statusOptions = [
  { value: 1, label: '启用' },
  { value: 2, label: '停用' },
];

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const maxImageSize = 5 * 1024 * 1024;
const dateTimeFormat = 'YYYY-MM-DD HH:mm:ss';

const parseDateTime = (value?: string) => {
  if (!value) return undefined;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : undefined;
};

const formatDateTimeValue = (value: unknown) => {
  if (!value) return '';
  if (dayjs.isDayjs(value)) return value.format(dateTimeFormat);
  return String(value);
};

export default function Announcements() {
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const { message } = AntApp.useApp();
  const imageUrl = Form.useWatch('image_url', form) as string | undefined;

  const load = async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    try {
      const values = filterForm.getFieldsValue();
      const res = await listAnnouncements({
        page: targetPage,
        page_size: targetPageSize,
        keyword: values.keyword,
        status: values.status,
      });
      setRows((res.items || res.list || []) as AnnouncementRow[]);
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

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 1, start_time: dayjs(), end_time: undefined, image_url: '' });
    setDrawerOpen(true);
  };

  const openEdit = async (id: React.Key) => {
    const detail = (await getAnnouncement(id)) as AnnouncementRow;
    setEditing(detail);
    form.resetFields();
    form.setFieldsValue({
      ...detail,
      start_time: parseDateTime(detail.start_time),
      end_time: parseDateTime(detail.end_time),
    });
    setDrawerOpen(true);
  };

  const beforeImageUpload = (file: RcFile) => {
    if (!allowedImageTypes.includes(file.type)) {
      message.error('仅支持 JPG、PNG、GIF、WebP 图片');
      return Upload.LIST_IGNORE;
    }
    if (file.size > maxImageSize) {
      message.error('图片不能超过 5MB');
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const uploadImage: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    try {
      if (!(file instanceof File)) {
        throw new Error('请选择有效图片文件');
      }
      setImageUploading(true);
      const result = await uploadAnnouncementImage(file);
      form.setFieldValue('image_url', result.url);
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

  const save = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        start_time: formatDateTimeValue(values.start_time),
        end_time: formatDateTimeValue(values.end_time),
      };
      if (editing) {
        await updateAnnouncement(editing.id, payload);
      } else {
        await createAnnouncement(payload);
      }
      message.success('公告已保存');
      setDrawerOpen(false);
      await load(editing ? page : 1);
    } finally {
      setSubmitting(false);
    }
  };

  const changeEnabled = async (row: AnnouncementRow) => {
    if (Number(row.status) === 1) {
      await disableAnnouncement(row.id);
      message.success('公告已停用');
    } else {
      await enableAnnouncement(row.id);
      message.success('公告已启用');
    }
    await load();
  };

  const remove = async (id: React.Key) => {
    await deleteAnnouncement(id);
    message.success('公告已删除');
    await load(1);
  };

  const columns: ColumnsType<AnnouncementRow> = [
    { title: 'ID', dataIndex: 'id', width: 80, className: 'mono' },
    { title: '标题', dataIndex: 'title', width: 220, ellipsis: true },
    { title: '内容', dataIndex: 'content', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (_, row) => <StatusTag value={row.status_label || row.status} />,
    },
    { title: '开始时间', dataIndex: 'start_time', width: 180, className: 'mono' },
    { title: '结束时间', dataIndex: 'end_time', width: 180, className: 'mono', render: (v) => v || '长期' },
    {
      title: '操作',
      width: 220,
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => openEdit(row.id)}>
            编辑
          </Button>
          <Button size="small" onClick={() => changeEnabled(row)}>
            {Number(row.status) === 1 ? '停用' : '启用'}
          </Button>
          <Popconfirm title="删除公告？" okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => remove(row.id)}>
            <Button size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  const tableColumns = useTableColumnSettings('announcements', columns);

  return (
    <>
      <PageHeader
        title="公告管理"
        description="发布站内公告，用户进入小程序时会看到未读公告。"
        extra={(
          <Space>
            {tableColumns.button}
            <Button type="primary" onClick={openCreate}>
              新增公告
            </Button>
          </Space>
        )}
      />
      <Card className="filter-card">
        <Form form={filterForm} layout="inline" onFinish={() => load(1)}>
          <Form.Item name="keyword">
            <Input.Search placeholder="标题 / 内容" allowClear />
          </Form.Item>
          <Form.Item name="status">
            <Select placeholder="状态" allowClear style={{ width: 130 }} options={statusOptions} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
            <Button onClick={() => { filterForm.resetFields(); setTimeout(() => load(1), 0); }}>
              重置
            </Button>
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
        title={editing ? '编辑公告' : '新增公告'}
        width={620}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Form form={form} layout="vertical" onFinish={save} disabled={submitting}>
          <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
            <Input maxLength={80} showCount />
          </Form.Item>
          <Form.Item label="内容" name="content" rules={[{ required: true, message: '请输入内容' }]}>
            <Input.TextArea rows={7} maxLength={1000} showCount />
          </Form.Item>
          <Form.Item name="image_url" hidden>
            <Input />
          </Form.Item>
          <Form.Item label="公告图片">
            <div className="announcement-upload">
              {imageUrl ? (
                <div className="announcement-upload-preview">
                  <img src={imageUrl} alt="公告图片预览" />
                  <Button icon={<DeleteOutlined />} onClick={() => form.setFieldValue('image_url', '')}>
                    移除图片
                  </Button>
                </div>
              ) : null}
              <Upload
                accept="image/jpeg,image/png,image/gif,image/webp"
                beforeUpload={beforeImageUpload}
                customRequest={uploadImage}
                disabled={submitting || imageUploading}
                maxCount={1}
                showUploadList={false}
              >
                <Button icon={<UploadOutlined />} loading={imageUploading}>
                  {imageUrl ? '重新上传图片' : '上传图片'}
                </Button>
              </Upload>
              <Typography.Text type="secondary">支持 JPG、PNG、GIF、WebP，单张不超过 5MB。</Typography.Text>
            </div>
          </Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true }]}>
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item label="开始时间" name="start_time">
            <DatePicker className="mono" format={dateTimeFormat} showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="结束时间" name="end_time" extra="为空表示长期有效">
            <DatePicker allowClear className="mono" format={dateTimeFormat} showTime style={{ width: '100%' }} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              保存公告
            </Button>
            <Button onClick={() => setDrawerOpen(false)} disabled={submitting}>
              取消
            </Button>
          </Space>
          <Typography.Paragraph type="secondary" className="settings-note">
            同时存在多个有效公告时，小程序只弹出最新发布的一条。
          </Typography.Paragraph>
        </Form>
      </Drawer>
    </>
  );
}
