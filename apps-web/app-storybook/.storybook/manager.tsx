import { addons } from 'storybook/manager-api';
import { themes } from 'storybook/theming';

const updateManagerTheme = (theme: 'light' | 'dark') => {
  addons.setConfig({
    theme: theme === 'light' ? themes.light : themes.dark,
  });
};

const listenSystemThemeChange = () => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (e) => {
    updateManagerTheme(e.matches ? 'dark' : 'light');
  });
  updateManagerTheme(mediaQuery.matches ? 'dark' : 'light');
};

listenSystemThemeChange();
