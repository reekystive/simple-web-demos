import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReflowBenchmark } from './reflow-benchmark.js';

const meta: Meta = {
  title: 'Demos/ReflowBenchmark',
};

export default meta;

export const Default: StoryObj = {
  render: () => <ReflowBenchmark />,
};
