import { buttonVariants } from '#src/components/button/button-variants.js';
import { faker } from '@faker-js/faker';
import { cn } from '@monorepo/utils';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo } from 'react';
import { createSimpleConsoleLogger } from './simple-console-logger.js';
import { SimpleConsoleRender } from './simple-console.js';

const meta: Meta = {
  title: 'Demos/SimpleConsole',
};

export default meta;

export const Default: StoryObj = {
  render: () => {
    const simpleConsole = useMemo(() => createSimpleConsoleLogger(), []);

    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 p-4">
        <SimpleConsoleRender className="self-stretch" console={simpleConsole} />
        <button
          className={cn(buttonVariants({ color: 'blue', size: 'md' }))}
          onClick={() => {
            simpleConsole.log(faker.lorem.sentence());
          }}
        >
          Log something
        </button>
      </div>
    );
  },
};
