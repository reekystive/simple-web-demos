import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/{,.}*.stories.{,c,m}{j,t}s{,x}'],
};

export default config;
