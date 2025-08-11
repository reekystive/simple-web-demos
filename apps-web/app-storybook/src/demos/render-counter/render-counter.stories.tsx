import type { Meta, StoryObj } from '@storybook/react-vite';
import { RenderCounterDemo } from './render-counter.js';

const meta: Meta = {
  title: 'Demos/RenderCounter',
};

export default meta;

export const Default: StoryObj = {
  render: () => <RenderCounterDemo />,
};
