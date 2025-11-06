import { cn } from '@monorepo/utils';
import { motion } from 'motion/react';
import { FC } from 'react';
import { useSpringBufferContext } from './spring-buffer-provider.js';

export const RenderArea: FC = () => {
  const { renderedValueSpringMV, bufferValueSpringMV } = useSpringBufferContext();

  return (
    <div
      className={cn(
        `
          relative rounded-sm border border-neutral-400/50 bg-white/70 p-3 leading-relaxed tracking-normal text-black
          dark:border-neutral-600/40 dark:bg-black/70 dark:text-white
        `
      )}
    >
      {/* layer 1: rendered value */}
      <div className="relative min-h-lh whitespace-pre-wrap">
        <motion.span>{renderedValueSpringMV}</motion.span>
        <motion.span className="opacity-0 select-none">{bufferValueSpringMV}</motion.span>

        {/* layer 2: buffer value */}
        <div className="pointer-events-none absolute inset-0 min-h-lh">
          <motion.span className="opacity-0 select-none">{renderedValueSpringMV}</motion.span>
          <motion.span className="opacity-40">{bufferValueSpringMV}</motion.span>
        </div>

        {/* layer 3: cursor */}
        <div className="pointer-events-none absolute inset-0 min-h-lh">
          <motion.span className="opacity-0 select-none">{renderedValueSpringMV}</motion.span>
          <div className="relative inline-block h-0 w-0 align-bottom">
            <div className="absolute bottom-0 left-0 h-lh w-[2px] bg-emerald-500/80"></div>
          </div>
          <motion.span className="opacity-0 select-none">{bufferValueSpringMV}</motion.span>
        </div>
      </div>
    </div>
  );
};
