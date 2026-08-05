import { LockOutlined, ThunderboltOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, App as AntApp, Typography } from 'antd';
import { LoginFormPage, ProFormText } from '@ant-design/pro-components';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loginCommunityImage from '../assets/login-community.jpg';
import { adminLogin } from '../api/admin';
import { setSession } from '../auth';

type LoginValues = { username: string; password: string };

function errorMessage(error: unknown) {
  const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (responseMessage) return responseMessage;
  return error instanceof Error ? error.message : '登录失败，请稍后重试';
}

export default function Login() {
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  const onFinish = async (values: LoginValues) => {
    setSubmitting(true);
    setLoginError('');
    try {
      const res = await adminLogin(values);
      setSession(res.token, res.admin);
      message.success('登录成功');
      navigate('/dashboard', { replace: true });
      return true;
    } catch (error) {
      setLoginError(errorMessage(error));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page login-pro-page">
      <LoginFormPage<LoginValues>
        activityConfig={{
          title: (
            <div className="login-visual-content">
              <img src={loginCommunityImage} alt="游戏社群成员正在联机游玩" className="login-visual-image" />
              <div className="login-visual-scrim" />
              <div className="login-visual-copy">
                <div className="login-visual-brand">
                  <span className="login-mark"><ThunderboltOutlined /></span>
                  <div>
                    <Typography.Text className="login-visual-title">兔兔窝管理后台</Typography.Text>
                    <Typography.Text className="login-visual-subtitle">GAME TAKEOVER ADMIN</Typography.Text>
                  </div>
                </div>
                <Typography.Title level={1}>连接每一次组队</Typography.Title>
                <Typography.Paragraph>把接龙、审核与社群运营放在同一张工作台。</Typography.Paragraph>
              </div>
            </div>
          ),
        }}
        className="login-form-page"
        message={loginError ? <Alert type="error" showIcon message={loginError} /> : false}
        onFinish={onFinish}
        submitter={{
          searchConfig: { submitText: '进入工作台' },
          submitButtonProps: { loading: submitting, disabled: submitting },
        }}
        style={{ minHeight: '100dvh' }}
        title={false}
        subTitle={false}
      >
        <div className="login-form-heading">
          <Typography.Text>管理员登录</Typography.Text>
          <Typography.Title level={2}>进入工作台</Typography.Title>
          <Typography.Paragraph>使用管理员账号继续管理接龙与社群。</Typography.Paragraph>
        </div>
        <ProFormText
          label="管理员账号"
          name="username"
          rules={[{ required: true, message: '请输入管理员账号' }]}
          fieldProps={{ autoComplete: 'username', prefix: <UserOutlined /> }}
        />
        <ProFormText.Password
          label="密码"
          name="password"
          rules={[{ required: true, message: '请输入密码' }]}
          fieldProps={{ autoComplete: 'current-password', prefix: <LockOutlined /> }}
        />
      </LoginFormPage>
    </main>
  );
}
