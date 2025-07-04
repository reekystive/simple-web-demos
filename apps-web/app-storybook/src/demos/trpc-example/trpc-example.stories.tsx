import type { Meta, StoryObj } from '@storybook/react-vite';
import { TRPCExample } from './trpc-example.js';

const meta: Meta = {
  title: 'Demos/tRPC Example',
};

export default meta;

export const Default: StoryObj = {
  render: () => <TRPCExample />,
};
