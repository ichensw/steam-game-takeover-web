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
          colorBgBase: '#07080b',
          colorBgContainer: '#11141a',
          colorBgElevated: '#151922',
          colorBorder: '#262b36',
          colorText: '#f1f4f8',
          colorTextSecondary: '#9da7b8',
          colorTextTertiary: '#697386',
          borderRadius: 14,
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
            headerBg: '#10131a',
            rowHoverBg: '#1b202b',
            borderColor: '#252b36',
          },
          Card: {
            colorBgContainer: '#11141a',
            paddingLG: 22,
            borderRadiusLG: 18,
          },
          Drawer: {
            colorBgElevated: '#10131a',
          },
          Modal: {
            contentBg: '#10131a',
            headerBg: '#10131a',
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
