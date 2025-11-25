import type { Meta, StoryObj } from '@storybook/react-vite';
import { LiquidDebugger } from './liquid-debugger.js';
import { LiquidDiv } from './liquid-div.js';
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

export const Debugger: StoryObj = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => <LiquidDebugger />,
};

export const SimpleLiquidDiv: StoryObj = {
  parameters: {
    layout: 'centered',
  },
  render: () => (
    <LiquidDiv disableDraggingCursor className="max-w-lg rounded-xl bg-neutral-500/20 p-4">
      Nulla eu elit excepteur sunt. Cupidatat minim anim minim aliqua velit id. Velit aute exercitation veniam non
      eiusmod exercitation cillum voluptate laborum labore consequat enim nulla est. Nostrud enim voluptate sit aute
      laborum officia fugiat ut ullamco commodo ullamco nulla duis. Excepteur nisi veniam laboris aute magna. Magna nisi
      incididunt aliqua ut ipsum velit nisi aliqua reprehenderit excepteur nostrud excepteur ex dolor. Eu reprehenderit
      qui dolor adipisicing exercitation mollit tempor nisi sint esse enim consectetur.
    </LiquidDiv>
  ),
};
