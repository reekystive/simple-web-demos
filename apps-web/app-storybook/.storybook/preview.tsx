import '#src/global.css';
import { createQueryClient } from '#src/providers/tanstack-query.js';
import type { Preview } from '@storybook/react-vite';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { scan } from 'react-scan';
import { Toaster } from 'sonner';
import { ThemeProvider, useTheme } from './preview-utils/theme-context.js';
import { resolveTheme, THEME_STORAGE_KEY } from './preview-utils/theme.js';

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
    theme: 'system',
  },
  decorators: [
    // Sonner Toast decorator
    function Decorator(Story) {
      const theme = useTheme();
      return (
        <>
          <Toaster theme={theme} />
          <Story />
        </>
      );
    },
    // Theme decorator
    function Decorator(Story, context) {
      const media = useRef(window.matchMedia('(prefers-color-scheme: dark)'));
      const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(media.current.matches ? 'dark' : 'light');
      const selectedTheme = (context.globals as { theme: 'light' | 'dark' | 'system' | undefined }).theme ?? 'system';
      const resolvedTheme = resolveTheme(selectedTheme, systemTheme);

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

      return (
        <ThemeProvider value={resolvedTheme}>
          <Story />
        </ThemeProvider>
      );
    },
    // Tanstack Query decorator. create a new query client for each story.
    function Decorator(Story) {
      const queryClient = createQueryClient();
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};

export default preview;

if (import.meta.env.DEV) {
  scan({ enabled: true });
}
