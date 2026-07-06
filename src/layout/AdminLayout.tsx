import {
  DashboardOutlined,
  FormOutlined,
  LogoutOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Flex, Layout, Menu, Typography, App as AntApp } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { adminLogout } from '../api/admin';
import { clearSession, getAdmin } from '../auth';

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '控制台' },
  { key: '/takeovers', icon: <TeamOutlined />, label: '接龙管理' },
  { key: '/users', icon: <UserOutlined />, label: '用户管理' },
  { key: '/feedbacks', icon: <FormOutlined />, label: '反馈管理' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const admin = getAdmin();
  const { message } = AntApp.useApp();

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

  return (
    <Layout className="admin-shell">
      <Layout.Sider width={264} className="admin-sider">
        <div className="brand">
          <div className="brand-mark">TTW</div>
          <div>
            <Typography.Text className="brand-title">Takeover Ops</Typography.Text>
            <Typography.Text className="brand-subtitle">Night Operations Desk</Typography.Text>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[`/${location.pathname.split('/')[1] || 'dashboard'}`]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="admin-menu"
        />
        <div className="sider-footer">
          <Typography.Text type="secondary">当前管理员</Typography.Text>
          <Typography.Text className="mono">{admin?.username || 'admin'}</Typography.Text>
        </div>
      </Layout.Sider>
      <Layout className="admin-main">
        <Layout.Header className="admin-topbar">
          <Flex align="center" justify="space-between">
            <Typography.Text className="topbar-copy">
              深色社区运营台 · 接龙 / 用户 / 反馈
            </Typography.Text>
            <Button icon={<LogoutOutlined />} onClick={onLogout}>
              退出
            </Button>
          </Flex>
        </Layout.Header>
        <Layout.Content className="admin-content">
          <main className="route-stage">
            <Outlet />
          </main>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

