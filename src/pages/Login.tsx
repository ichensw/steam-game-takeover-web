import { LockOutlined, SafetyCertificateOutlined, TeamOutlined, ThunderboltOutlined, UserOutlined } from '@ant-design/icons';
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
          <div className="login-identity">
            <span className="login-mark"><ThunderboltOutlined /></span>
            <Typography.Text className="login-kicker">Steam Game Takeover</Typography.Text>
          </div>
          <div className="login-copy-body">
            <Typography.Title>运营工作台</Typography.Title>
            <Typography.Paragraph>为接龙、社群与审核而设计的管理员入口。</Typography.Paragraph>
          </div>
          <div className="login-signals" aria-label="管理范围">
            <span><TeamOutlined /> 接龙</span>
            <span><SafetyCertificateOutlined /> 审核</span>
            <span><ThunderboltOutlined /> KOOK</span>
          </div>
        </div>
        <Card className="login-card">
          <div className="login-form-heading">
            <Typography.Text>管理员认证</Typography.Text>
            <Typography.Title level={2}>进入工作台</Typography.Title>
          </div>
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

