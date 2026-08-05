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
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#087f6b',
          colorInfo: '#2876a8',
          colorSuccess: '#2f8d5c',
          colorWarning: '#ae701b',
          colorError: '#bc4a42',
          colorBgBase: '#f3f5f2',
          colorBgContainer: '#ffffff',
          colorBgElevated: '#ffffff',
          colorBorder: '#d8e0db',
          colorText: '#17231e',
          colorTextSecondary: '#66756d',
          colorTextTertiary: '#849189',
          borderRadius: 8,
          borderRadiusLG: 8,
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
            headerBg: '#f4f7f4',
            rowHoverBg: '#f0f6f2',
            borderColor: '#dce4df',
            cellPaddingBlock: 11,
            cellPaddingInline: 14,
          },
          Card: {
            colorBgContainer: '#ffffff',
            paddingLG: 18,
            borderRadiusLG: 8,
          },
          Drawer: {
            colorBgElevated: '#ffffff',
          },
          Modal: {
            contentBg: '#ffffff',
            headerBg: '#ffffff',
          },
          Button: {
            borderRadius: 8,
            controlHeight: 36,
          },
          Input: {
            borderRadius: 8,
          },
          Select: {
            borderRadius: 8,
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
