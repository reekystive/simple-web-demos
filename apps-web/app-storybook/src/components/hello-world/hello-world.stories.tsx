import type { Meta, StoryObj } from '@storybook/react-vite';
import { HelloWorld } from './hello-world.js';

const meta: Meta = {
  title: 'Components/HelloWorld',
};

export default meta;

export const Default: StoryObj = {
  render: () => <HelloWorld />,
};
