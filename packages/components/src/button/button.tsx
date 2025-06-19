import { cn } from '@monorepo/utils';
import { FC, ReactNode } from 'react';

export const Button: FC<{ className?: string; children?: ReactNode }> = ({ className }) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border px-2 py-4 font-mono text-sm',
        className
      )}
    >
      🚧 WIP Button
    </div>
  );
};
