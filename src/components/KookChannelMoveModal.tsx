import { Form, Modal, Select } from 'antd';
import { useEffect, useMemo } from 'react';
import type { KookChannelMoveRequest } from '../api/admin';

type Channel = {
  id: React.Key;
  name?: string;
  type?: number;
  parent_id?: string;
  parentId?: string;
};

type Props = {
  open: boolean;
  source: Channel | null;
  channels: Channel[];
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (request: KookChannelMoveRequest) => Promise<void>;
};

const parentIdOf = (channel: Channel) => String(channel.parent_id || channel.parentId || '0');

export default function KookChannelMoveModal({ open, source, channels, loading, onCancel, onConfirm }: Props) {
  const [form] = Form.useForm<KookChannelMoveRequest>();
  const targetParentId = Form.useWatch('targetParentId', form);
  const placement = Form.useWatch('placement', form);
  const sourceIsCategory = Number(source?.type) === 0;

  useEffect(() => {
    if (!open || !source) return;
    form.setFieldsValue({
      targetParentId: sourceIsCategory ? '0' : parentIdOf(source),
      placement: sourceIsCategory ? 'after' : 'bottom',
      anchorChannelId: undefined,
    });
  }, [form, open, source, sourceIsCategory]);

  const anchors = useMemo(() => channels
    .filter((channel) => String(channel.id) !== String(source?.id))
    .filter((channel) => sourceIsCategory
      ? Number(channel.type) === 0 && parentIdOf(channel) === '0'
      : Number(channel.type) !== 0 && parentIdOf(channel) === String(targetParentId || '0'))
    .map((channel) => ({ value: String(channel.id), label: channel.name || String(channel.id) })),
  [channels, source?.id, sourceIsCategory, targetParentId]);

  const needsAnchor = placement === 'before' || placement === 'after';

  return (
    <Modal
      title={`移动频道 - ${source?.name || ''}`}
      open={open}
      confirmLoading={loading}
      okText="确认移动"
      cancelText="取消"
      onCancel={onCancel}
      onOk={() => form.validateFields().then(onConfirm)}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="targetParentId" label="目标分组" rules={[{ required: true, message: '请选择目标分组' }]}>
          <Select
            disabled={sourceIsCategory}
            options={[
              { value: '0', label: '移出分组（根目录）' },
              ...channels.filter((channel) => Number(channel.type) === 0).map((channel) => ({
                value: String(channel.id),
                label: channel.name || String(channel.id),
              })),
            ]}
            onChange={() => form.setFieldValue('anchorChannelId', undefined)}
          />
        </Form.Item>
        <Form.Item name="placement" label="目标位置" rules={[{ required: true, message: '请选择目标位置' }]}>
          <Select
            options={sourceIsCategory
              ? [{ value: 'before', label: '指定分组之前' }, { value: 'after', label: '指定分组之后' }]
              : [
                { value: 'top', label: '分组顶部' },
                { value: 'bottom', label: '分组底部' },
                { value: 'before', label: '指定频道之前' },
                { value: 'after', label: '指定频道之后' },
              ]}
            onChange={() => form.setFieldValue('anchorChannelId', undefined)}
          />
        </Form.Item>
        {needsAnchor && (
          <Form.Item name="anchorChannelId" label="参照频道" rules={[{ required: true, message: '请选择参照频道' }]}>
            <Select showSearch optionFilterProp="label" options={anchors} />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
