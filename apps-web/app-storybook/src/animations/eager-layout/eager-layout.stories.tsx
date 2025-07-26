import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  EagerLayout,
  EagerLayoutSideBySide,
  EagerLayoutWithoutAnimation,
  EagerLayoutWithoutEager,
} from './eager-layout.js';

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

export const WithoutAnimation: StoryObj = {
  render: () => <EagerLayoutWithoutAnimation />,
};

export const WithoutEager: StoryObj = {
  render: () => <EagerLayoutWithoutEager />,
};

export const SideBySide: StoryObj = {
  render: () => <EagerLayoutSideBySide />,
};
