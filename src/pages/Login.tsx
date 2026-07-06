import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Typography, App as AntApp } from 'antd';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../api/admin';
import { setSession } from '../auth';

export default function Login() {
  const navigate = useNavigate();
  const { message } = AntApp.useApp();

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      const res = await adminLogin(values);
      setSession(res.token, res.admin);
      message.success('登录成功');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败');
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-copy">
          <Typography.Text className="login-kicker">Steam Game Takeover</Typography.Text>
          <Typography.Title>后台管理</Typography.Title>
          <Typography.Paragraph>
            管理接龙、用户、反馈和系统开关。深色工作台优先保证高密度信息和重复操作效率。
          </Typography.Paragraph>
        </div>
        <Card className="login-card">
          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              label="管理员账号"
              name="username"
              rules={[{ required: true, message: '请输入管理员账号' }]}
            >
              <Input prefix={<UserOutlined />} autoComplete="username" />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                autoComplete="current-password"
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              进入控制台
            </Button>
          </Form>
        </Card>
      </section>
    </main>
  );
}

