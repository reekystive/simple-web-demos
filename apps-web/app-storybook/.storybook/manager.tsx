/* eslint-disable react-refresh/only-export-components */

import * as React from 'react';
import { addons, types, useGlobals } from 'storybook/manager-api';
import { themes } from 'storybook/theming';

const globals = {
  theme: 'system' as 'system' | 'light' | 'dark',
};

const states = {
  systemTheme: 'dark' as 'light' | 'dark',
};

const updateManagerTheme = () => {
  const resolvedTheme = globals.theme === 'system' ? states.systemTheme : globals.theme;
  addons.setConfig({
    theme: resolvedTheme === 'light' ? themes.light : themes.dark,
  });
};

const listenSystemThemeChange = () => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (e) => {
    states.systemTheme = e.matches ? 'dark' : 'light';
    updateManagerTheme();
  });
  states.systemTheme = mediaQuery.matches ? 'dark' : 'light';
  updateManagerTheme();
};

listenSystemThemeChange();

const ManagerThemeSyncEffect: React.FC = () => {
  const [{ theme }] = useGlobals();
  React.useEffect(() => {
    globals.theme = theme as 'system' | 'light' | 'dark';
    updateManagerTheme();
  }, [theme]);
  return null;
};

addons.register('app/manager-theme-sync-effect', () => {
  addons.add('app/manager-theme-sync-effect', {
    type: types.TOOL,
    title: 'ManagerThemeSyncEffect',
    match: () => true,
    render: () => <ManagerThemeSyncEffect />,
  });
});
