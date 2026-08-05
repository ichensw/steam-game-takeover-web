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
          colorPrimary: '#6d28d9',
          colorInfo: '#6d28d9',
          colorSuccess: '#4f8a64',
          colorWarning: '#a66a16',
          colorError: '#b84444',
          colorBgBase: '#f8f9f8',
          colorBgContainer: '#ffffff',
          colorBgElevated: '#ffffff',
          colorBorder: '#e8eae8',
          colorText: '#171717',
          colorTextSecondary: '#666666',
          colorTextTertiary: '#929292',
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
            headerBg: '#fafafa',
            rowHoverBg: '#faf8ff',
            borderColor: '#e8eae8',
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
