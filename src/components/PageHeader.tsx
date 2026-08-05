import { Flex, Typography } from 'antd';

type Props = {
  title: string;
  description: string;
  extra?: React.ReactNode;
};

const workspaceNames: Record<string, string> = {
  '运营中枢': 'OVERVIEW',
  '用户管理': 'USER MANAGEMENT',
  '用户拉黑关系': 'USER BLOCKS',
  '管理员账号': 'ADMIN ACCOUNTS',
  '接龙管理': 'TAKEOVER MANAGEMENT',
  '举报审核': 'REPORT REVIEW',
  'KOOK 频道': 'KOOK CHANNELS',
  'KOOK 角色': 'KOOK ROLES',
  'KOOK 成员': 'KOOK MEMBERS',
  'KOOK 用户': 'KOOK USERS',
  '语音统计': 'VOICE ANALYTICS',
  '反馈管理': 'FEEDBACK',
  '公告管理': 'ANNOUNCEMENTS',
  '系统设置': 'SYSTEM SETTINGS',
  '微信消息查询': 'WECHAT MESSAGES',
  '微信聊天统计': 'WECHAT ANALYTICS',
  '微信群管理': 'WECHAT GROUPS',
  '微信数据库浏览': 'WECHAT DATABASE',
  'AI 聊天检索': 'AI MEMORY',
  'AI 总结': 'AI SUMMARY',
  '用户详情': 'USER DETAIL',
  '接龙详情': 'TAKEOVER DETAIL',
  '举报详情': 'REPORT DETAIL',
  'KOOK 频道详情': 'KOOK CHANNEL DETAIL',
  'KOOK 成员详情': 'KOOK MEMBER DETAIL',
  '反馈详情': 'FEEDBACK DETAIL',
  '公告详情': 'ANNOUNCEMENT DETAIL',
};

export default function PageHeader({ title, description, extra }: Props) {
  return (
    <Flex align="flex-start" justify="space-between" gap={20} className="page-header">
      <div className="page-header-copy">
        <Typography.Text className="page-kicker">// {workspaceNames[title] || 'ADMIN WORKSPACE'}</Typography.Text>
        <Typography.Title level={2}>{title}</Typography.Title>
        <Typography.Text type="secondary">{description}</Typography.Text>
      </div>
      {extra ? <div className="page-header-actions">{extra}</div> : null}
    </Flex>
  );
}

