import type { Meta, StoryObj } from '@storybook/react-vite';
import { SvgClipPath } from './svg-clip-path.js';

const meta: Meta = {
  title: 'Demos/SvgClipPath',
};

export default meta;

export const Default: StoryObj = {
  render: () => <SvgClipPath />,
};
