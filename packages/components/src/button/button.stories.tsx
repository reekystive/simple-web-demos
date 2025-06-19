import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button.js';

const meta: Meta = {
  title: 'Components/Button',
};

export default meta;

export const Default: StoryObj = {
  render: () => <Button />,
};
