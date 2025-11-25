import type { Meta, StoryObj } from '@storybook/react-vite';
import { Search } from 'lucide-react';
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

export const LiquidDivWithText: StoryObj = {
  parameters: {
    layout: 'centered',
  },
  render: () => (
    <LiquidDiv liquidConfig={{ disableDraggingCursor: true }} className="max-w-lg rounded-xl bg-neutral-500/20 p-4">
      Nulla eu elit excepteur sunt. Cupidatat minim anim minim aliqua velit id. Velit aute exercitation veniam non
      eiusmod exercitation cillum voluptate laborum labore consequat enim nulla est. Nostrud enim voluptate sit aute
      laborum officia fugiat ut ullamco commodo ullamco nulla duis. Excepteur nisi veniam laboris aute magna. Magna nisi
      incididunt aliqua ut ipsum velit nisi aliqua reprehenderit excepteur nostrud excepteur ex dolor. Eu reprehenderit
      qui dolor adipisicing exercitation mollit tempor nisi sint esse enim consectetur.
    </LiquidDiv>
  ),
};

export const LiquidRoundButton: StoryObj = {
  parameters: {
    layout: 'centered',
  },
  render: () => (
    <LiquidDiv liquidConfig={{ disableDraggingCursor: true }} className="h-12 w-12">
      <div
        className={`
          flex h-full w-full flex-col items-center justify-center rounded-full bg-neutral-500/20 outline-[0.5px]
          outline-offset-[-0.25px] outline-neutral-500/30 transition-all ease-out
          active:scale-110 active:bg-neutral-400/40
        `}
      >
        <Search className="opacity-80" />
      </div>
    </LiquidDiv>
  ),
};
