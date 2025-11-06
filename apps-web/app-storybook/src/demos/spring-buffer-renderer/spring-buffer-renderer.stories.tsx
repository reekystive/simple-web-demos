import type { Meta, StoryObj } from '@storybook/react-vite';
import { SpringBufferRenderer } from './spring-buffer-renderer.js';

const meta: Meta = {
  title: 'Demos/SpringBufferRenderer',
};

export default meta;

export const Default: StoryObj = {
  render: () => <SpringBufferRenderer />,
};
