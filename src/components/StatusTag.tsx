import { Tag } from 'antd';

const STATUS_MAP: Record<string, { color: string; text: string }> = {
  normal: { color: 'green', text: '进行中' },
  closed: { color: 'default', text: '已结束' },
  ended: { color: 'default', text: '已结束' },
  已结束: { color: 'default', text: '已结束' },
  未开始: { color: 'blue', text: '未开始' },
  进行中: { color: 'green', text: '进行中' },
  已满员: { color: 'purple', text: '已满员' },
  pending: { color: 'orange', text: '待处理' },
  blocked: { color: 'red', text: '已封禁' },
  active: { color: 'green', text: '正常' },
  disabled: { color: 'red', text: '禁用' },
  limited: { color: 'orange', text: '受限' },
  1: { color: 'orange', text: '待采纳' },
  2: { color: 'green', text: '已采纳' },
  3: { color: 'default', text: '不理睬' },
};

export default function StatusTag({ value }: { value: unknown }) {
  const key = String(value ?? '');
  const mapped = STATUS_MAP[key] || { color: 'blue', text: key || '-' };
  return <Tag color={mapped.color}>{mapped.text}</Tag>;
}
