import {
  AlertOutlined,
  AppstoreOutlined,
  BellOutlined,
  CrownOutlined,
  DashboardOutlined,
  FormOutlined,
  LogoutOutlined,
  MenuOutlined,
  SettingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Badge, Button, Drawer, Flex, Form, Input, Layout, Menu, Modal, Space, Typography, Upload, App as AntApp } from 'antd';
import type { MenuProps } from 'antd';
import type { RcFile, UploadProps } from 'antd/es/upload/interface';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { adminLogout, getAdminMe, updateAdminMe, updateAdminPassword, uploadAdminImage } from '../api/admin';
import { ADMIN_PERMISSION_KOOK_MANAGE, clearSession, getAdmin, getToken, hasAdminPermission, setSession } from '../auth';
import type { AdminUser } from '../auth';

type MenuItem = Required<MenuProps>['items'][number];

const buildMenuItems = (canManageKook: boolean, isSuperAdmin: boolean): MenuItem[] => [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '控制台' },
  {
    key: 'takeover-group',
    icon: <TeamOutlined />,
    label: '接龙',
    children: [
      { key: '/takeovers', icon: <TeamOutlined />, label: '接龙管理' },
      { key: '/reports', icon: <AlertOutlined />, label: '举报审核' },
    ],
  },
  {
    key: 'user-group',
    icon: <UserOutlined />,
    label: '用户',
    children: [
      { key: '/users', icon: <UserOutlined />, label: '用户管理' },
      ...(isSuperAdmin ? [{ key: '/admin-users', icon: <UserOutlined />, label: '管理员账号' }] : []),
    ],
  },
  ...(canManageKook
    ? [{
        key: 'kook-group',
        icon: <AppstoreOutlined />,
        label: 'KOOK',
        children: [
          { key: '/kook-channels', icon: <AppstoreOutlined />, label: 'KOOK 频道' },
          { key: '/kook-roles', icon: <CrownOutlined />, label: 'KOOK 角色' },
          { key: '/kook-members', icon: <TeamOutlined />, label: 'KOOK 成员' },
          { key: '/kook-users', icon: <UserOutlined />, label: 'KOOK 用户' },
        ],
      } as MenuItem]
    : []),
  {
    key: 'content-group',
    icon: <BellOutlined />,
    label: '内容',
    children: [
      { key: '/feedbacks', icon: <FormOutlined />, label: '反馈管理' },
      { key: '/announcements', icon: <BellOutlined />, label: '公告管理' },
    ],
  },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
];

const flatMenuItems = (items: MenuItem[]) => items.flatMap((item) => {
  if (item && 'children' in item && item.children) return item.children;
  return item ? [item] : [];
});

const openKeyByPath: Record<string, string> = {
  '/takeovers': 'takeover-group',
  '/reports': 'takeover-group',
  '/users': 'user-group',
  '/admin-users': 'user-group',
  '/kook-channels': 'kook-group',
  '/kook-roles': 'kook-group',
  '/kook-members': 'kook-group',
  '/kook-users': 'kook-group',
  '/feedbacks': 'content-group',
  '/announcements': 'content-group',
};

const menuItemLabel = (item: MenuItem | undefined) => {
  if (item && 'label' in item) return item.label;
  return undefined;
};

const allowedAvatarTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const maxAvatarSize = 5 * 1024 * 1024;

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = AntApp.useApp();
  const [admin, setAdmin] = useState<AdminUser | null>(() => getAdmin());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const avatarUrl = Form.useWatch('avatarUrl', profileForm) as string | undefined;
  const menuItems = buildMenuItems(hasAdminPermission(admin, ADMIN_PERMISSION_KOOK_MANAGE), Boolean(admin?.isSuperAdmin || admin?.username === 'admin'));
  const availableItems = flatMenuItems(menuItems);
  const selectedKey = `/${location.pathname.split('/')[1] || 'dashboard'}`;
  const currentLabel = menuItemLabel(availableItems.find((item) => item?.key === selectedKey));
  const adminName = admin?.nickname || admin?.username || 'admin';

  const onLogout = async () => {
    try {
      await adminLogout();
    } catch {
      // Logout must still clear local state if the token is already invalid.
    }
    clearSession();
    message.success('已退出登录');
    navigate('/login', { replace: true });
  };

  const saveAdminSession = (nextAdmin: AdminUser) => {
    setAdmin(nextAdmin);
    setSession(getToken(), nextAdmin);
  };

  const openProfile = async () => {
    setMobileNavOpen(false);
    setProfileOpen(true);
    passwordForm.resetFields();
    profileForm.setFieldsValue({ nickname: admin?.nickname || '', avatarUrl: admin?.avatarUrl || '' });
    try {
      const latest = await getAdminMe();
      saveAdminSession(latest);
      profileForm.setFieldsValue({ nickname: latest.nickname || '', avatarUrl: latest.avatarUrl || '' });
    } catch {
      // Existing response interceptor handles expired tokens.
    }
  };

  const beforeAvatarUpload = (file: RcFile) => {
    if (!allowedAvatarTypes.includes(file.type)) {
      message.error('仅支持 JPG、PNG、GIF、WebP 图片');
      return Upload.LIST_IGNORE;
    }
    if (file.size > maxAvatarSize) {
      message.error('图片不能超过 5MB');
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const uploadAvatar: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    try {
      if (!(file instanceof File)) throw new Error('请选择有效图片文件');
      setAvatarUploading(true);
      const result = await uploadAdminImage(file);
      profileForm.setFieldValue('avatarUrl', result.url);
      onSuccess?.(result);
      message.success('头像已上传');
    } catch (error) {
      const uploadError = error instanceof Error ? error : new Error('头像上传失败');
      onError?.(uploadError);
      message.error(uploadError.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveProfile = async (values: { nickname?: string; avatarUrl?: string }) => {
    setProfileSaving(true);
    try {
      const updated = await updateAdminMe(values);
      saveAdminSession(updated);
      message.success('资料已保存');
    } finally {
      setProfileSaving(false);
    }
  };

  const savePassword = async (values: { oldPassword: string; newPassword: string; confirmPassword: string }) => {
    setPasswordSaving(true);
    try {
      await updateAdminPassword({ oldPassword: values.oldPassword, newPassword: values.newPassword });
      message.success('密码已修改，请重新登录');
      clearSession();
      navigate('/login', { replace: true });
    } finally {
      setPasswordSaving(false);
    }
  };

  const renderNavMenu = () => (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      defaultOpenKeys={openKeyByPath[selectedKey] ? [openKeyByPath[selectedKey]] : []}
      items={menuItems}
      onClick={({ key }) => {
        navigate(String(key));
        setMobileNavOpen(false);
      }}
      className="admin-menu"
    />
  );

  return (
    <Layout className="admin-shell">
      <Layout.Sider width={264} className="admin-sider">
        <div className="brand">
          <div className="brand-mark">
            <ThunderboltOutlined />
          </div>
          <div>
            <Typography.Text className="brand-title">兔兔窝接龙</Typography.Text>
            <Typography.Text className="brand-subtitle">后台管理系统</Typography.Text>
          </div>
        </div>
        {renderNavMenu()}
        <div className="sider-footer">
          <span className="status-dot" />
          <div>
            <Typography.Text type="secondary">当前管理员</Typography.Text>
            <Typography.Text className="mono">{adminName}</Typography.Text>
          </div>
        </div>
      </Layout.Sider>
      <Layout className="admin-main">
        <Layout.Header className="admin-topbar">
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={12} className="topbar-heading">
              <Button
                aria-label="打开导航菜单"
                className="mobile-nav-trigger"
                icon={<MenuOutlined />}
                onClick={() => setMobileNavOpen(true)}
                shape="circle"
              />
              <div>
                <Typography.Text className="topbar-copy">深色社区运营台</Typography.Text>
                <Typography.Title level={3} className="topbar-title">
                  {currentLabel || '控制台'}
                </Typography.Title>
              </div>
            </Flex>
            <Space size={12} className="topbar-actions">
              <Badge count={0} size="small">
                <Button shape="circle" icon={<BellOutlined />} />
              </Badge>
              <Button className="admin-avatar-button" onClick={openProfile}>
                <Avatar className="admin-avatar" src={admin?.avatarUrl}>
                  {adminName.slice(0, 1)}
                </Avatar>
              </Button>
              <Button icon={<LogoutOutlined />} onClick={onLogout}>
                退出
              </Button>
            </Space>
          </Flex>
        </Layout.Header>
        <Layout.Content className="admin-content">
          <main className="route-stage">
            <Outlet />
          </main>
        </Layout.Content>
      </Layout>
      <Drawer
        className="mobile-nav-drawer"
        closeIcon={null}
        onClose={() => setMobileNavOpen(false)}
        open={mobileNavOpen}
        placement="left"
        width={304}
      >
        <div className="brand mobile-drawer-brand">
          <div className="brand-mark">
            <ThunderboltOutlined />
          </div>
          <div>
            <Typography.Text className="brand-title">兔兔窝接龙</Typography.Text>
            <Typography.Text className="brand-subtitle">后台管理系统</Typography.Text>
          </div>
        </div>
        {renderNavMenu()}
        <div className="mobile-drawer-footer">
          <div>
            <Typography.Text type="secondary">当前管理员</Typography.Text>
            <Typography.Text className="mono">{adminName}</Typography.Text>
          </div>
          <Space>
            <Button icon={<UserOutlined />} onClick={openProfile}>
              个人资料
            </Button>
            <Button icon={<LogoutOutlined />} onClick={onLogout}>
              退出
            </Button>
          </Space>
        </div>
      </Drawer>
      <Modal
        title="个人资料"
        open={profileOpen}
        onCancel={() => setProfileOpen(false)}
        footer={null}
        width={560}
      >
        <div className="admin-profile-modal">
          <Form form={profileForm} layout="vertical" onFinish={saveProfile}>
            <Form.Item name="avatarUrl" hidden>
              <Input />
            </Form.Item>
            <div className="admin-profile-avatar-row">
              <Avatar size={72} src={avatarUrl} className="admin-profile-avatar">
                {adminName.slice(0, 1)}
              </Avatar>
              <Upload
                accept="image/jpeg,image/png,image/gif,image/webp"
                beforeUpload={beforeAvatarUpload}
                customRequest={uploadAvatar}
                disabled={avatarUploading || profileSaving}
                maxCount={1}
                showUploadList={false}
              >
                <Button icon={<UploadOutlined />} loading={avatarUploading}>
                  上传头像
                </Button>
              </Upload>
            </div>
            <Form.Item label="昵称" name="nickname">
              <Input maxLength={64} showCount placeholder="管理员昵称" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={profileSaving}>
              保存资料
            </Button>
          </Form>
          <div className="profile-divider" />
          <Form form={passwordForm} layout="vertical" onFinish={savePassword}>
            <Form.Item label="原密码" name="oldPassword" rules={[{ required: true, message: '请输入原密码' }]}>
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Form.Item label="新密码" name="newPassword" rules={[{ required: true, min: 6, max: 64, message: '请输入 6-64 位新密码' }]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              label="确认新密码"
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: '请再次输入新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                    return Promise.reject(new Error('两次输入的新密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Button htmlType="submit" loading={passwordSaving}>
              修改密码
            </Button>
          </Form>
        </div>
      </Modal>
    </Layout>
  );
}
