import { addons } from 'storybook/manager-api';
import { themes } from 'storybook/theming';

const handleSystemThemeChange = (theme: 'light' | 'dark') => {
  addons.setConfig({
    theme: theme === 'light' ? themes.light : themes.dark,
  });
  addons.setConfig({});
};

const listenSystemThemeChange = () => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (e) => {
    handleSystemThemeChange(e.matches ? 'dark' : 'light');
  });
  handleSystemThemeChange(mediaQuery.matches ? 'dark' : 'light');
};

listenSystemThemeChange();
