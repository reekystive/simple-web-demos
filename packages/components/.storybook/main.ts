import type { StorybookConfig } from '@storybook/react-vite';
import type { UserConfig } from 'vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/{,.}*.stories.{,c,m}{j,t}s{,x}'],
  viteFinal: (config: UserConfig) => {
    return {
      ...config,
      // @ts-expect-error - using custom identifier to the plugin to filter it out in storybook builds
      plugins: config.plugins?.filter((p) => p?.identifier !== 'unplugin-dts/vite'),
    };
  },
};

export default config;
