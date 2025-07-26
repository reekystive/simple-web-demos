import type { Meta, StoryObj } from '@storybook/react-vite';
import { EagerLayout } from './eager-layout.js';

const meta: Meta = {
  title: 'Animations/EagerLayout',
};

export default meta;

export const Default: StoryObj = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => <EagerLayout />,
};
