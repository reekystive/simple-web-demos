import type { StorybookConfig } from '@storybook/react-vite';
import { UserConfig } from 'vite';

const viteFinal = (config: UserConfig): UserConfig => {
  return {
    ...config,
    server: {
      ...config.server,
      proxy: {
        '/trpc': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/trpc/, ''),
        },
      },
    },
    build: {
      ...config.build,
      chunkSizeWarningLimit: 1500,
      sourcemap: process.env.ENABLE_SOURCE_MAP === 'true',
    },
  };
};

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/{,.}*.stories.{,c,m}{j,t}s{,x}'],
  viteFinal,
};

export default config;
