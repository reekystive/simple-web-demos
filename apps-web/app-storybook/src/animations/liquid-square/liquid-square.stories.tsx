import type { Meta, StoryObj } from '@storybook/react-vite';
import { LiquidSquare } from './liquid-square.js';

const meta: Meta = {
  title: 'Animations/LiquidSquare',
  id: 'liquid-square',
};

export default meta;

export const Default: StoryObj = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => <LiquidSquare />,
};
