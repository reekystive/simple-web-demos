import { cn } from '@monorepo/utils';
import { ButtonHTMLAttributes, FC } from 'react';

export const Button: FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className, ...props }) => {
  return (
    <button
      className={cn(
        'dark:border-blur-600/20 cursor-pointer rounded-sm border border-blue-600/40 bg-blue-600/80 px-1.5 py-0.5 text-sm text-white transition-all duration-150 ease-out hover:opacity-90 active:opacity-70 dark:border-blue-500/20 dark:bg-blue-500/20',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const ScrollAnchoring: FC = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <Button>Remount</Button>
    </div>
  );
};
