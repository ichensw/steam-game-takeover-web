import { ArrowLeftOutlined, LinkOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  Alert,
  Avatar,
  Button,
  Descriptions,
  Empty,
  Image,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getAnnouncement,
  getFeedback,
  getKookChannel,
  getKookChannelRoles,
  getKookMember,
  getReport,
  getTakeover,
  getUser,
  listTakeoverMemberActivities,
} from '../api/admin';
import { permissionText } from '../constants/kookPermissions';
import PageHeader from '../components/PageHeader';
import StatusTag from '../components/StatusTag';

type EntityKind = 'users' | 'takeovers' | 'reports' | 'kook-channels' | 'kook-members' | 'feedbacks' | 'announcements';
type DetailData = Record<string, unknown>;
type DetailItem = { label: string; value: React.ReactNode; span?: number };

const configurations: Record<EntityKind, {
  title: string;
  description: string;
  load: (id: string) => Promise<DetailData>;
}> = {
  users: { title: '用户详情', description: '查看用户资料、账号状态与信誉信息。', load: getUser },
  takeovers: { title: '接龙详情', description: '查看接龙信息、成员与进出记录。', load: getTakeover },
  reports: { title: '举报详情', description: '查看举报双方、证据与处理结果。', load: getReport },
  'kook-channels': { title: 'KOOK 频道详情', description: '查看频道层级、使用情况与权限对象。', load: (id) => getKookChannel(id, { needChildren: true }) },
  'kook-members': { title: 'KOOK 成员详情', description: '查看成员资料、角色与黑名单状态。', load: getKookMember },
  feedbacks: { title: '反馈详情', description: '查看用户反馈、附件与处理状态。', load: getFeedback },
  announcements: { title: '公告详情', description: '查看公告内容、图片与生效时间。', load: getAnnouncement },
};

function errorMessage(error: unknown) {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (message) return message;
  return error instanceof Error ? error.message : '加载详情失败';
}

function pick(data: DetailData, keys: string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(data, key)) return data[key];
  }
  return undefined;
}

function text(data: DetailData, keys: string[], fallback = '-') {
  const value = pick(data, keys);
  if (value === null || value === undefined || value === '') return fallback;
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

function truthy(data: DetailData, keys: string[]) {
  const value = pick(data, keys);
  return value === true || value === 1 || value === '1' || value === 'true';
}

function stringList(data: DetailData, keys: string[]) {
  const value = pick(data, keys);
  if (Array.isArray(value)) return value.filter((item): item is string | number => typeof item === 'string' || typeof item === 'number').map(String).filter(Boolean);
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string | number => typeof item === 'string' || typeof item === 'number').map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function recordList(data: DetailData, keys: string[]) {
  const value = pick(data, keys);
  return Array.isArray(value) ? value.filter((item): item is DetailData => !!item && typeof item === 'object' && !Array.isArray(item)) : [];
}

function DescriptionList({ items }: { items: DetailItem[] }) {
  return (
    <Descriptions column={{ xs: 1, md: 2 }} size="small" className="entity-detail-grid">
      {items.map((item) => (
        <Descriptions.Item key={item.label} label={item.label} span={item.span}>
          {item.value}
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="entity-detail-section">
      <Typography.Title level={4}>{title}</Typography.Title>
      {children}
    </section>
  );
}

function PersonAvatar({ name, url, size = 36 }: { name: string; url?: string; size?: number }) {
  return <Avatar size={size} src={url}>{name.trim().slice(0, 1) || '用'}</Avatar>;
}

function PersonCell({ data, nameKeys, avatarKeys, idKeys }: {
  data: DetailData;
  nameKeys: string[];
  avatarKeys?: string[];
  idKeys?: string[];
}) {
  const name = text(data, nameKeys, '未知用户');
  const id = idKeys ? text(data, idKeys, '') : '';
  const avatarUrl = avatarKeys ? text(data, avatarKeys, '') : '';
  return (
    <Space size={10} className="entity-person">
      <PersonAvatar name={name} url={avatarUrl || undefined} />
      <span>
        <Typography.Text>{name}</Typography.Text>
        {id ? <Typography.Text type="secondary" className="mono">{id}</Typography.Text> : null}
      </span>
    </Space>
  );
}

function ImageGallery({ urls, label = '图片' }: { urls: string[]; label?: string }) {
  if (!urls.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`暂无${label}`} className="entity-inline-empty" />;
  return (
    <Image.PreviewGroup>
      <div className="entity-image-gallery" aria-label={`${label} ${urls.length} 张`}>
        {urls.map((url, index) => (
          <Image key={`${url}-${index}`} src={url} alt={`${label} ${index + 1}`} width={116} height={84} />
        ))}
      </div>
    </Image.PreviewGroup>
  );
}

function OpenLink({ url }: { url: string }) {
  if (!url || url === '-') return <>-</>;
  return (
    <Tooltip title="打开链接">
      <Button aria-label="打开链接" icon={<LinkOutlined />} href={url} target="_blank" rel="noreferrer" />
    </Tooltip>
  );
}

function reportState(value: unknown) {
  const state = Number(value);
  if (state === 1 || value === 'pending') return <Tag color="gold">待处理</Tag>;
  if (state === 2 || value === 'approved') return <Tag color="green">已扣分</Tag>;
  if (state === 3 || value === 'rejected') return <Tag>已驳回</Tag>;
  return <Tag>{value ? String(value) : '-'}</Tag>;
}

function feedbackState(value: unknown) {
  const state = Number(value);
  if (state === 1) return <Tag color="gold">待采纳</Tag>;
  if (state === 2) return <Tag color="green">已采纳</Tag>;
  if (state === 3) return <Tag>不理睬</Tag>;
  return <Tag>{value ? String(value) : '-'}</Tag>;
}

function genderText(value: string) {
  if (value === '1' || value === 'male') return '男';
  if (value === '2' || value === 'female') return '女';
  return value || '-';
}

function UserDetail({ data }: { data: DetailData }) {
  const nickname = text(data, ['nickname', 'nickName', 'name'], '未知用户');
  return (
    <>
      <DetailSection title="基础信息">
        <DescriptionList items={[
          { label: '用户', value: <PersonCell data={data} nameKeys={['nickname', 'nickName', 'name']} avatarKeys={['avatarUrl', 'avatar_url']} idKeys={['id', 'userId', 'user_id']} />, span: 2 },
          { label: 'Steam ID', value: <span className="mono">{text(data, ['steamId', 'steam_id'])}</span> },
          { label: '性别', value: genderText(text(data, ['gender', 'genderText'], '')) },
          { label: 'OpenID', value: <span className="mono">{text(data, ['openid', 'openId', 'open_id'])}</span>, span: 2 },
          { label: '创建时间', value: <span className="mono">{text(data, ['createdAt', 'created_at', 'gmtCreate'])}</span> },
          { label: '更新时间', value: <span className="mono">{text(data, ['updatedAt', 'updated_at', 'gmtModified'])}</span> },
        ]} />
      </DetailSection>
      <DetailSection title="当前状态">
        <DescriptionList items={[
          { label: '账号状态', value: truthy(data, ['isBanned', 'is_banned', 'blocked']) ? <Tag color="red">已封禁</Tag> : <Tag color="green">正常</Tag> },
          { label: '资料完成度', value: truthy(data, ['profileCompleted', 'profile_completed']) ? <Tag color="green">资料完整</Tag> : <Tag color="gold">待补充</Tag> },
          { label: 'Steam ID 校验', value: truthy(data, ['steamIdVerified', 'steam_id_verified']) ? <Tag color="green">已验证</Tag> : <Tag>未验证</Tag> },
          { label: '信誉分', value: text(data, ['creditScore', 'credit_score']) },
          { label: '封禁原因', value: text(data, ['banReason', 'ban_reason']) , span: 2 },
          { label: '封禁时间', value: <span className="mono">{text(data, ['bannedAt', 'banned_at'])}</span> },
          { label: '发布白名单', value: truthy(data, ['publishWhitelisted', 'publish_whitelisted']) ? '已开通' : '未开通' },
        ]} />
      </DetailSection>
      <DetailSection title="资料头像">
        <div className="entity-avatar-panel"><PersonAvatar name={nickname} url={text(data, ['avatarUrl', 'avatar_url'], '') || undefined} size={76} /><Typography.Text type="secondary">用户头像</Typography.Text></div>
      </DetailSection>
    </>
  );
}

function TakeoverDetail({ data, activities, activitiesLoading, activityError, onRetryActivities }: {
  data: DetailData;
  activities: DetailData[];
  activitiesLoading: boolean;
  activityError: string;
  onRetryActivities: () => void;
}) {
  const members = recordList(data, ['members', 'participants']);
  const memberColumns: ColumnsType<DetailData> = [
    { title: '成员', width: 180, render: (_, row) => <PersonCell data={row} nameKeys={['nickname', 'nickName', 'name']} avatarKeys={['avatarUrl', 'avatar_url']} idKeys={['userId', 'user_id', 'id']} /> },
    { title: 'Steam ID', width: 180, render: (_, row) => <span className="mono">{text(row, ['steamId', 'steam_id'])}</span> },
    { title: '备注', dataIndex: 'remark', ellipsis: true, render: (_, row) => text(row, ['remark']) },
    { title: '加入时间', width: 180, render: (_, row) => <span className="mono">{text(row, ['joinedAt', 'joined_at'])}</span> },
  ];
  const activityColumns: ColumnsType<DetailData> = [
    { title: '成员', width: 180, render: (_, row) => <PersonCell data={row} nameKeys={['nickname', 'nickName', 'name']} idKeys={['userId', 'user_id']} /> },
    { title: '动作', width: 100, render: (_, row) => <Tag>{text(row, ['actionText', 'action'], Number(pick(row, ['action'])) === 2 ? '退出' : '加入')}</Tag> },
    { title: '备注', dataIndex: 'remark', ellipsis: true, render: (_, row) => text(row, ['remark']) },
    { title: '时间', width: 180, render: (_, row) => <span className="mono">{text(row, ['createdAt', 'created_at'])}</span> },
  ];
  return (
    <>
      <DetailSection title="基础信息">
        <DescriptionList items={[
          { label: '接龙 ID', value: <span className="mono">{text(data, ['id', 'takeoverId'])}</span> },
          { label: '状态', value: <StatusTag value={pick(data, ['statusLabel', 'status', 'takeoverState'])} /> },
          { label: '标题', value: text(data, ['title']), span: 2 },
          { label: '创建人', value: text(data, ['creatorName', 'creatorNickname', 'creator_name']) },
          { label: '参与人数', value: `${text(data, ['joinedCount', 'joined_count'], '0')} / ${text(data, ['participantLimit', 'participant_limit'])}` },
          { label: '活动时间', value: <span className="mono">{text(data, ['scheduleText', 'schedule_text'])}</span>, span: 2 },
          { label: 'KOOK 频道', value: text(data, ['kookChannelName', 'kook_channel_name']) },
          { label: '频道邀请', value: <OpenLink url={text(data, ['kookInviteUrl', 'kook_invite_url'], '')} /> },
          { label: '创建时间', value: <span className="mono">{text(data, ['createdAt', 'created_at'])}</span> },
          { label: '更新时间', value: <span className="mono">{text(data, ['updatedAt', 'updated_at'])}</span> },
        ]} />
      </DetailSection>
      <DetailSection title="接龙说明">
        <Typography.Paragraph className="entity-rich-text">{text(data, ['description'])}</Typography.Paragraph>
      </DetailSection>
      <DetailSection title="汇总状态">
        <DescriptionList items={[
          { label: '汇总展示词', value: text(data, ['summaryName', 'summary_name']) },
          { label: '汇总来源', value: text(data, ['summarySource', 'summary_source']) },
          { label: '汇总更新时间', value: <span className="mono">{text(data, ['summaryUpdatedAt', 'summary_updated_at'])}</span> },
          { label: '汇总异常', value: text(data, ['summaryError', 'summary_error']) },
        ]} />
      </DetailSection>
      <DetailSection title={`接龙成员（${members.length}）`}>
        <Table rowKey={(row, index) => String(pick(row, ['userId', 'user_id', 'id']) || index)} size="small" columns={memberColumns} dataSource={members} pagination={false} scroll={{ x: 740 }} locale={{ emptyText: '暂无相关数据' }} />
      </DetailSection>
      <DetailSection title="成员进出记录">
        {activityError ? <Alert type="error" showIcon message={activityError} action={<Button size="small" onClick={onRetryActivities}>重试</Button>} /> : (
          <Table rowKey={(row, index) => String(pick(row, ['id']) || index)} size="small" loading={activitiesLoading} columns={activityColumns} dataSource={activities} pagination={false} scroll={{ x: 640 }} locale={{ emptyText: '暂无相关数据' }} />
        )}
      </DetailSection>
    </>
  );
}

function ReportDetail({ data }: { data: DetailData }) {
  const images = stringList(data, ['imageUrls', 'image_urls', 'images']);
  return (
    <>
      <DetailSection title="举报信息">
        <DescriptionList items={[
          { label: '举报 ID', value: <span className="mono">{text(data, ['id', 'reportId'])}</span> },
          { label: '处理状态', value: reportState(pick(data, ['state', 'status'])) },
          { label: '所属接龙', value: text(data, ['takeoverTitle', 'takeover_title']), span: 2 },
          { label: '提交时间', value: <span className="mono">{text(data, ['createdAt', 'created_at'])}</span> },
          { label: '处理时间', value: <span className="mono">{text(data, ['handledAt', 'handled_at'])}</span> },
        ]} />
      </DetailSection>
      <DetailSection title="涉及用户">
        <DescriptionList items={[
          { label: '举报人', value: <PersonCell data={data} nameKeys={['reporterNickname', 'reporter_nickname']} avatarKeys={['reporterAvatarUrl', 'reporter_avatar_url']} idKeys={['reporterUserId', 'reporter_user_id']} /> },
          { label: '举报人 Steam ID', value: <span className="mono">{text(data, ['reporterSteamId', 'reporter_steam_id'])}</span> },
          { label: '被举报人', value: <PersonCell data={data} nameKeys={['reportedNickname', 'reported_nickname']} avatarKeys={['reportedAvatarUrl', 'reported_avatar_url']} idKeys={['reportedUserId', 'reported_user_id']} /> },
          { label: '被举报人 Steam ID', value: <span className="mono">{text(data, ['reportedSteamId', 'reported_steam_id'])}</span> },
          { label: '被举报人信誉分', value: text(data, ['reportedCreditScore', 'reported_credit_score']) },
          { label: '扣除信誉分', value: text(data, ['penaltyScore', 'penalty_score']) },
        ]} />
      </DetailSection>
      <DetailSection title="举报说明"><Typography.Paragraph className="entity-rich-text">{text(data, ['content'])}</Typography.Paragraph></DetailSection>
      <DetailSection title={`举报图片（${images.length}）`}><ImageGallery urls={images} label="举报图片" /></DetailSection>
      <DetailSection title="审核记录"><Typography.Paragraph className="entity-rich-text">{text(data, ['handleNote', 'handle_note'])}</Typography.Paragraph></DetailSection>
    </>
  );
}

function flattenChannels(rows: DetailData[], depth = 0): DetailData[] {
  return rows.flatMap((row) => {
    const children = recordList(row, ['children']);
    return [{ ...row, detailDepth: depth }, ...flattenChannels(children, depth + 1)];
  });
}

export function permissionObjectName(row: DetailData) {
  const nestedUser = pick(row, ['user']);
  if (nestedUser && typeof nestedUser === 'object' && !Array.isArray(nestedUser)) {
    const name = text(nestedUser as DetailData, ['displayName', 'nickname', 'username', 'name'], '');
    if (name) return name;
  }
  return text(row, ['objectName', 'displayName', 'nickname', 'username', 'name', 'userName']);
}

export function permissionObjectId(row: DetailData) {
  const nestedUser = pick(row, ['user']);
  if (nestedUser && typeof nestedUser === 'object' && !Array.isArray(nestedUser)) {
    const id = text(nestedUser as DetailData, ['id', 'userId', 'user_id'], '');
    if (id) return id;
  }
  return text(row, ['user_id', 'userId', 'role_id', 'roleId', 'id']);
}

function KookChannelDetail({ data, permissions, permissionsLoading, permissionError, onRetryPermissions }: {
  data: DetailData;
  permissions: DetailData[];
  permissionsLoading: boolean;
  permissionError: string;
  onRetryPermissions: () => void;
}) {
  const channels = flattenChannels(recordList(data, ['children', 'channels']));
  const channelColumns: ColumnsType<DetailData> = [
    { title: '频道名称', render: (_, row) => <span style={{ paddingLeft: Number(pick(row, ['detailDepth'])) * 18 }}>{text(row, ['name', 'channelName', 'channel_name'])}</span> },
    { title: '频道类型', width: 100, render: (_, row) => ({ 0: '分组', 1: '文字', 2: '语音' }[Number(pick(row, ['type']))] || '未知') },
    { title: '层级', width: 90, render: (_, row) => text(row, ['level']) },
    { title: '人数上限', width: 110, render: (_, row) => text(row, ['limitAmount', 'limit_amount']) },
  ];
  const permissionColumns: ColumnsType<DetailData> = [
    { title: '对象名称', width: 200, render: (_, row) => permissionObjectName(row) },
    { title: '对象 ID', width: 180, render: (_, row) => <span className="mono">{permissionObjectId(row)}</span> },
    { title: '允许权限', render: (_, row) => permissionText(pick(row, ['allow'])) },
    { title: '拒绝权限', render: (_, row) => permissionText(pick(row, ['deny'])) },
  ];
  return (
    <>
      <DetailSection title="基础信息">
        <DescriptionList items={[
          { label: '频道 ID', value: <span className="mono">{text(data, ['id', 'channelId', 'channel_id'])}</span> },
          { label: '频道名称', value: text(data, ['name', 'channelName', 'channel_name']) },
          { label: '频道类型', value: ({ 0: '分组', 1: '文字', 2: '语音' }[Number(pick(data, ['type']))] || '-') },
          { label: '所属分组', value: text(data, ['parentName', 'parent_name', 'parentId', 'parent_id']) },
          { label: '层级', value: text(data, ['level']) },
          { label: '人数上限', value: text(data, ['limitAmount', 'limit_amount']) },
          { label: '活跃人数', value: text(data, ['activeUserCount', 'active_user_count']) },
          { label: '使用时长', value: text(data, ['durationText', 'duration_text']) },
        ]} />
      </DetailSection>
      <DetailSection title="子频道层级">
        <Table rowKey={(row, index) => String(pick(row, ['id', 'channelId', 'channel_id']) || index)} size="small" columns={channelColumns} dataSource={channels} pagination={false} scroll={{ x: 560 }} locale={{ emptyText: '暂无相关数据' }} />
      </DetailSection>
      <DetailSection title="频道权限">
        {permissionError ? <Alert type="error" showIcon message={permissionError} action={<Button size="small" onClick={onRetryPermissions}>重试</Button>} /> : (
          <Table rowKey={(row, index) => String(pick(row, ['id', 'user_id', 'userId', 'role_id', 'roleId']) || index)} size="small" loading={permissionsLoading} columns={permissionColumns} dataSource={permissions} pagination={false} scroll={{ x: 760 }} locale={{ emptyText: '暂无相关数据' }} />
        )}
      </DetailSection>
    </>
  );
}

function KookMemberDetail({ data }: { data: DetailData }) {
  const roleIds = stringList(data, ['roleIds', 'role_ids']);
  const nickname = text(data, ['nickname', 'username', 'name'], '未知成员');
  return (
    <>
      <DetailSection title="成员资料">
        <DescriptionList items={[
          { label: '成员', value: <PersonCell data={data} nameKeys={['nickname', 'username', 'name']} avatarKeys={['avatarUrl', 'avatar_url']} idKeys={['kookUserId', 'kook_user_id']} />, span: 2 },
          { label: '服务器 ID', value: <span className="mono">{text(data, ['guildId', 'guild_id'])}</span> },
          { label: '识别码', value: <span className="mono">{text(data, ['identifyNum', 'identify_num'])}</span> },
          { label: '加入时间', value: <span className="mono">{text(data, ['joinedAt', 'joined_at'])}</span> },
          { label: '退出时间', value: <span className="mono">{text(data, ['exitedAt', 'exited_at'])}</span> },
          { label: '备注', value: text(data, ['remark']), span: 2 },
        ]} />
      </DetailSection>
      <DetailSection title="当前状态">
        <DescriptionList items={[
          { label: '成员状态', value: Number(pick(data, ['memberStatus', 'member_status'])) === 2 ? <Tag>已退出</Tag> : <Tag color="green">在服</Tag> },
          { label: '机器人账号', value: truthy(data, ['isBot', 'is_bot', 'bot']) ? '是' : '否' },
          { label: '黑名单状态', value: truthy(data, ['isBlacklisted', 'is_blacklisted']) ? <Tag color="red">已拉黑</Tag> : <Tag color="green">正常</Tag> },
          { label: '拉黑时间', value: <span className="mono">{text(data, ['blacklistedAt', 'blacklisted_at'])}</span> },
          { label: '拉黑原因', value: text(data, ['blacklistReason', 'blacklist_reason']), span: 2 },
        ]} />
      </DetailSection>
      <DetailSection title={`角色（${roleIds.length}）`}>
        {roleIds.length ? <div className="entity-id-list">{roleIds.map((roleId) => <span key={roleId} className="mono">角色 ID：{roleId}</span>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无相关数据" className="entity-inline-empty" />}
      </DetailSection>
      <DetailSection title="成员头像"><div className="entity-avatar-panel"><PersonAvatar name={nickname} url={text(data, ['avatarUrl', 'avatar_url'], '') || undefined} size={76} /><Typography.Text type="secondary">KOOK 头像</Typography.Text></div></DetailSection>
    </>
  );
}

function FeedbackDetail({ data }: { data: DetailData }) {
  const images = stringList(data, ['images', 'imageUrls', 'image_urls']);
  const type = ({ suggestion: '建议', problem: '问题', experience: '体验', other: '其他' }[text(data, ['feedback_type', 'feedbackType'], '')] || '-');
  return (
    <>
      <DetailSection title="反馈信息">
        <DescriptionList items={[
          { label: '反馈 ID', value: <span className="mono">{text(data, ['id'])}</span> },
          { label: '处理状态', value: feedbackState(pick(data, ['status'])) },
          { label: '提交用户', value: <PersonCell data={data} nameKeys={['nickname', 'nickName']} avatarKeys={['avatarUrl', 'avatar_url']} idKeys={['userId', 'user_id']} /> },
          { label: 'Steam ID', value: <span className="mono">{text(data, ['steamId', 'steam_id'])}</span> },
          { label: '反馈类型', value: type },
          { label: '联系方式', value: text(data, ['contact']) },
          { label: '提交时间', value: <span className="mono">{text(data, ['createdAt', 'created_at'])}</span> },
          { label: '更新时间', value: <span className="mono">{text(data, ['updatedAt', 'updated_at'])}</span> },
        ]} />
      </DetailSection>
      <DetailSection title="反馈内容"><Typography.Paragraph className="entity-rich-text">{text(data, ['content'])}</Typography.Paragraph></DetailSection>
      <DetailSection title={`反馈图片（${images.length}）`}><ImageGallery urls={images} label="反馈图片" /></DetailSection>
    </>
  );
}

function AnnouncementDetail({ data }: { data: DetailData }) {
  const imageUrl = text(data, ['imageUrl', 'image_url'], '');
  return (
    <>
      <DetailSection title="公告信息">
        <DescriptionList items={[
          { label: '公告 ID', value: <span className="mono">{text(data, ['id'])}</span> },
          { label: '状态', value: Number(pick(data, ['status'])) === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag> },
          { label: '标题', value: text(data, ['title']), span: 2 },
          { label: '开始时间', value: <span className="mono">{text(data, ['startTime', 'start_time'])}</span> },
          { label: '结束时间', value: <span className="mono">{text(data, ['endTime', 'end_time'], '长期有效')}</span> },
          { label: '创建时间', value: <span className="mono">{text(data, ['createdAt', 'created_at'])}</span> },
          { label: '更新时间', value: <span className="mono">{text(data, ['updatedAt', 'updated_at'])}</span> },
        ]} />
      </DetailSection>
      <DetailSection title="公告内容"><Typography.Paragraph className="entity-rich-text">{text(data, ['content'])}</Typography.Paragraph></DetailSection>
      <DetailSection title="公告图片"><ImageGallery urls={imageUrl ? [imageUrl] : []} label="公告图片" /></DetailSection>
    </>
  );
}

function DetailBody({ kind, data, activities, activitiesLoading, activityError, permissions, permissionsLoading, permissionError, onRetryActivities, onRetryPermissions }: {
  kind: EntityKind;
  data: DetailData;
  activities: DetailData[];
  activitiesLoading: boolean;
  activityError: string;
  permissions: DetailData[];
  permissionsLoading: boolean;
  permissionError: string;
  onRetryActivities: () => void;
  onRetryPermissions: () => void;
}) {
  if (kind === 'users') return <UserDetail data={data} />;
  if (kind === 'takeovers') return <TakeoverDetail data={data} activities={activities} activitiesLoading={activitiesLoading} activityError={activityError} onRetryActivities={onRetryActivities} />;
  if (kind === 'reports') return <ReportDetail data={data} />;
  if (kind === 'kook-channels') return <KookChannelDetail data={data} permissions={permissions} permissionsLoading={permissionsLoading} permissionError={permissionError} onRetryPermissions={onRetryPermissions} />;
  if (kind === 'kook-members') return <KookMemberDetail data={data} />;
  if (kind === 'feedbacks') return <FeedbackDetail data={data} />;
  return <AnnouncementDetail data={data} />;
}

export default function EntityDetail({ kind }: { kind: EntityKind }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const config = configurations[kind];
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activities, setActivities] = useState<DetailData[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [permissions, setPermissions] = useState<DetailData[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionError, setPermissionError] = useState('');

  const loadActivities = async () => {
    if (!id || kind !== 'takeovers') return;
    setActivitiesLoading(true);
    setActivityError('');
    try {
      const result = await listTakeoverMemberActivities(id, { page: 1, pageSize: 50 });
      setActivities((result.list || result.items || []) as DetailData[]);
    } catch (nextError) {
      setActivities([]);
      setActivityError(errorMessage(nextError));
    } finally {
      setActivitiesLoading(false);
    }
  };

  const loadPermissions = async () => {
    if (!id || kind !== 'kook-channels') return;
    setPermissionsLoading(true);
    setPermissionError('');
    try {
      const result = await getKookChannelRoles(id);
      setPermissions([
        ...recordList(result, ['permission_overwrites', 'permissionOverwrites']),
        ...recordList(result, ['permission_users', 'permissionUsers']),
      ]);
    } catch (nextError) {
      setPermissions([]);
      setPermissionError(errorMessage(nextError));
    } finally {
      setPermissionsLoading(false);
    }
  };

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      setData(await config.load(id));
      if (kind === 'takeovers') void loadActivities();
      if (kind === 'kook-channels') void loadPermissions();
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
          <DetailBody
            kind={kind}
            data={data}
            activities={activities}
            activitiesLoading={activitiesLoading}
            activityError={activityError}
            permissions={permissions}
            permissionsLoading={permissionsLoading}
            permissionError={permissionError}
            onRetryActivities={() => void loadActivities()}
            onRetryPermissions={() => void loadPermissions()}
          />
        </div>
      ) : null}
    </div>
  );
}
