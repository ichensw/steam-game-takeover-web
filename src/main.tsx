import React from 'react';
import ReactDOM from 'react-dom/client';
import { App as AntApp, ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#ff6a1a',
          colorInfo: '#6d7dff',
          colorSuccess: '#38d996',
          colorWarning: '#ffb020',
          colorError: '#ff5570',
          borderRadius: 10,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontFamilyCode:
            '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
        },
        components: {
          Layout: {
            bodyBg: 'transparent',
            headerBg: 'transparent',
            siderBg: 'transparent',
          },
          Table: {
            headerBg: '#181b22',
            rowHoverBg: '#20252f',
          },
          Card: {
            colorBgContainer: '#171a21',
          },
        },
      }}
    >
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);

