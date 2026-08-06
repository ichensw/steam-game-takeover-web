import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { App as AntApp, ConfigProvider, theme as antTheme } from 'antd';
import type { ThemeConfig } from 'antd';
import zhCN from 'antd/locale/zh_CN';

export type AppThemeMode = 'light' | 'dark';

type AppThemeContextValue = {
  mode: AppThemeMode;
  toggleTheme: () => void;
};

const themeStorageKey = 'steam-game-takeover-theme';
const AppThemeContext = createContext<AppThemeContextValue>({
  mode: 'dark',
  toggleTheme: () => undefined,
});

function initialTheme(): AppThemeMode {
  if (typeof window === 'undefined') return 'dark';
  return window.localStorage.getItem(themeStorageKey) === 'light' ? 'light' : 'dark';
}

const startingTheme = initialTheme();
if (typeof document !== 'undefined') {
  document.documentElement.dataset.theme = startingTheme;
}

const lightTheme: ThemeConfig = {
  algorithm: antTheme.defaultAlgorithm,
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
    fontFamily: 'Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontFamilyCode: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
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
};

const darkTheme: ThemeConfig = {
  algorithm: antTheme.darkAlgorithm,
  token: {
    colorPrimary: '#9b8cff',
    colorInfo: '#78a6ff',
    colorSuccess: '#43d99d',
    colorWarning: '#f3c85b',
    colorError: '#ff6b7f',
    colorBgBase: '#070a12',
    colorBgContainer: '#101622',
    colorBgElevated: '#151c2a',
    colorBorder: '#2a3446',
    colorText: '#f4f7fb',
    colorTextSecondary: '#aab4c3',
    colorTextTertiary: '#778294',
    borderRadius: 8,
    borderRadiusLG: 8,
    fontFamily: 'Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontFamilyCode: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  },
  components: {
    Layout: {
      bodyBg: 'transparent',
      headerBg: 'transparent',
      siderBg: 'transparent',
    },
    Table: {
      headerBg: '#151c2a',
      rowHoverBg: '#1b2540',
      borderColor: '#2a3446',
      cellPaddingBlock: 11,
      cellPaddingInline: 14,
    },
    Card: {
      colorBgContainer: '#101622',
      paddingLG: 18,
      borderRadiusLG: 8,
    },
    Drawer: {
      colorBgElevated: '#101622',
    },
    Modal: {
      contentBg: '#101622',
      headerBg: '#101622',
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
};

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppThemeMode>(startingTheme);
  const value = useMemo(
    () => ({
      mode,
      toggleTheme: () => setMode((current) => (current === 'dark' ? 'light' : 'dark')),
    }),
    [mode],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    window.localStorage.setItem(themeStorageKey, mode);
  }, [mode]);

  return (
    <AppThemeContext.Provider value={value}>
      <ConfigProvider locale={zhCN} theme={mode === 'dark' ? darkTheme : lightTheme}>
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(AppThemeContext);
}
