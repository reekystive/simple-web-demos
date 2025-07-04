import '#src/global.css';
import type { Preview } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';
import { scan } from 'react-scan';

const THEME_STORAGE_KEY = 'sb-theme';
const resolveTheme = (theme: 'light' | 'dark' | 'system', systemTheme: 'dark' | 'light') => {
  if (theme === 'system') return systemTheme;
  return theme;
};
const getSavedTheme = (): 'light' | 'dark' | 'system' => {
  const theme = localStorage.getItem(THEME_STORAGE_KEY);
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  return 'system';
};

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
  },
  globalTypes: {
    theme: {
      description: 'Global color theme',
      toolbar: {
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Always Light' },
          { value: 'dark', title: 'Always Dark' },
          { value: 'system', title: 'Follow System' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: getSavedTheme(),
  },
  decorators: [
    function Decorator(story, context) {
      const media = useRef(window.matchMedia('(prefers-color-scheme: dark)'));
      const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(media.current.matches ? 'dark' : 'light');
      const selectedTheme = (context.globals as { theme: 'light' | 'dark' | 'system' | undefined }).theme ?? 'system';

      useEffect(() => {
        localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);
      }, [selectedTheme]);

      useEffect(() => {
        const mediaQuery = media.current;
        const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
      }, []);

      useEffect(() => {
        const resolvedTheme = resolveTheme(selectedTheme, systemTheme);
        document.documentElement.setAttribute('data-theme', resolvedTheme);
      }, [selectedTheme, systemTheme]);

      return story();
    },
  ],
};

export default preview;

if (import.meta.env.DEV) {
  scan({ enabled: true });
}
