import { buttonVariants } from '#src/components/button/button-variants.js';
import { cn } from '@monorepo/utils';
import { ComponentProps, FC, useRef, useState } from 'react';

export const RenderCounterDemo: FC = () => {
  const [_, setCount] = useState(0);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2">
      <RenderCounter className="font-mono text-sm" />
      <button className={cn(buttonVariants({ color: 'blue', size: 'md' }))} onClick={() => setCount((c) => c + 1)}>
        Trigger re-render
      </button>
    </div>
  );
};

const RenderCounter: FC<ComponentProps<'div'>> = (props) => {
  const count = useRef(0);
  count.current++;
  return <div {...props}>Renders: {count.current}</div>;
};
