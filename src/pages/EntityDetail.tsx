import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Descriptions, Empty, Skeleton, Space, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getAnnouncement,
  getFeedback,
  getKookChannel,
  getKookMember,
  getReport,
  getTakeover,
  getUser,
} from '../api/admin';
import PageHeader from '../components/PageHeader';

type EntityKind = 'users' | 'takeovers' | 'reports' | 'kook-channels' | 'kook-members' | 'feedbacks' | 'announcements';
type DetailData = Record<string, unknown>;

const fields: Record<string, string> = {
  id: 'ID',
  title: '标题',
  name: '名称',
  nickname: '昵称',
  username: '用户名',
  openid: 'openid',
  steamId: 'SteamID',
  steam_id: 'SteamID',
  status: '状态',
  state: '状态',
  content: '内容',
  description: '说明',
  createdAt: '创建时间',
  updatedAt: '更新时间',
  created_at: '创建时间',
  updated_at: '更新时间',
  reporterNickname: '举报人',
  reportedNickname: '被举报人',
  takeoverTitle: '接龙',
  kookUserId: 'KOOK 用户 ID',
  kookChannelId: 'KOOK 频道 ID',
  guildId: 'KOOK 服务器 ID',
  scheduleText: '时间安排',
  participantLimit: '人数上限',
  joinedCount: '已加入人数',
  banReason: '封禁原因',
  blacklistReason: '拉黑原因',
  creditScore: '信誉分',
  handleNote: '处理备注',
  handledAt: '处理时间',
};

const configurations: Record<EntityKind, {
  title: string;
  description: string;
  load: (id: string) => Promise<DetailData>;
}> = {
  users: { title: '用户详情', description: '查看用户资料、状态与关联信息。', load: getUser },
  takeovers: { title: '接龙详情', description: '查看接龙信息、成员与活动记录。', load: getTakeover },
  reports: { title: '举报详情', description: '查看举报内容、证据与处理状态。', load: getReport },
  'kook-channels': { title: 'KOOK 频道详情', description: '查看频道结构、权限与关联信息。', load: (id) => getKookChannel(id, { needChildren: true }) },
  'kook-members': { title: 'KOOK 成员详情', description: '查看成员资料、状态、角色与权限。', load: getKookMember },
  feedbacks: { title: '反馈详情', description: '查看反馈内容、图片与处理状态。', load: getFeedback },
  announcements: { title: '公告详情', description: '查看公告内容、时间与发布状态。', load: getAnnouncement },
};

function fieldLabel(key: string) {
  return fields[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase());
}

function isMachineValue(key: string) {
  return /(^id$|id$|openid|steam|url|time|at$|date)/i.test(key);
}

function isSimpleValue(value: unknown) {
  return value === null || value === undefined || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function errorMessage(error: unknown) {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (message) return message;
  return error instanceof Error ? error.message : '加载详情失败';
}

export default function EntityDetail({ kind }: { kind: EntityKind }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const config = configurations[kind];
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      setData(await config.load(id));
    } catch (nextError) {
      setData(null);
      setError(errorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, kind]);

  const [basicFields, relatedFields] = useMemo(() => {
    const entries = Object.entries(data || {});
    return [
      entries.filter(([, value]) => isSimpleValue(value)),
      entries.filter(([, value]) => !isSimpleValue(value)),
    ];
  }, [data]);

  return (
    <div className="entity-detail-page">
      <PageHeader
        title={config.title}
        description={config.description}
        extra={(
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>刷新</Button>
          </Space>
        )}
      />

      {loading ? <Skeleton active paragraph={{ rows: 12 }} className="entity-detail-loading" /> : null}
      {error ? <Alert type="error" showIcon message={error} action={<Button size="small" onClick={() => void load()}>重试</Button>} /> : null}
      {!loading && !error && !data ? <Empty description="未找到详情数据" /> : null}
      {!loading && !error && data ? (
        <div className="entity-detail-content">
          <section className="entity-detail-section">
            <Typography.Title level={4}>基础信息</Typography.Title>
            <Descriptions column={{ xs: 1, md: 2 }} size="small" className="entity-detail-grid">
              {basicFields.map(([key, value]) => (
                <Descriptions.Item key={key} label={fieldLabel(key)}>
                  {typeof value === 'boolean' ? <Tag>{value ? '是' : '否'}</Tag> : (
                    <span className={isMachineValue(key) ? 'mono' : undefined}>{String(value ?? '-')}</span>
                  )}
                </Descriptions.Item>
              ))}
            </Descriptions>
          </section>

          {relatedFields.length ? (
            <section className="entity-detail-section">
              <Typography.Title level={4}>关联数据</Typography.Title>
              <div className="entity-detail-related">
                {relatedFields.map(([key, value]) => (
                  <div className="entity-detail-related-item" key={key}>
                    <Typography.Text strong>{fieldLabel(key)}</Typography.Text>
                    <Typography.Paragraph className="entity-detail-json" copyable={{ text: JSON.stringify(value, null, 2) }}>
                      {JSON.stringify(value, null, 2)}
                    </Typography.Paragraph>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
