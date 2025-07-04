import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollAnchoring } from './scroll-anchoring.js';

const meta: Meta = {
  title: 'Demos/ScrollAnchoring',
};

export default meta;

export const Default: StoryObj = {
  render: () => <ScrollAnchoring />,
};
