import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollLinkedTriggered } from './scroll-linked-triggered.js';

const meta: Meta = {
  title: 'Animations/Scroll Linked and Triggered',
};

export default meta;

export const Default: StoryObj = {
  render: () => <ScrollLinkedTriggered />,
};
