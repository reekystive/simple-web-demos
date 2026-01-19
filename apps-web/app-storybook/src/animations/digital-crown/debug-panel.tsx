import { cn } from '@monorepo/utils';
import { motion, MotionValue, useTransform } from 'motion/react';
import { FC } from 'react';

interface DebugPanelProps {
  scrollProgress: MotionValue<number>;
  triggeredIndex: MotionValue<number>;
  linkedValue: MotionValue<number>;
  combinedValue: MotionValue<number>;
  activeCard: number;
}

export const DebugPanel: FC<DebugPanelProps> = ({
  scrollProgress,
  triggeredIndex,
  linkedValue,
  combinedValue,
  activeCard,
}) => {
  const scrollProgressFixed = useTransform(scrollProgress, (v) => (v * 100).toFixed(1) + '%');
  const triggeredFixed = useTransform(triggeredIndex, (v) => v.toFixed(2));
  const linkedFixed = useTransform(linkedValue, (v) => v.toFixed(2));
  const combinedFixed = useTransform(combinedValue, (v) => v.toFixed(2));

  return (
    <>
      <div
        className={cn(`
          fixed bottom-4 left-1/2 grid -translate-x-1/2 grid-cols-[repeat(2,auto)] gap-x-6 gap-y-1 font-mono text-xs
          text-neutral-400 select-none
          md:grid-cols-[repeat(5,auto)]
        `)}
      >
        <p>
          <span className="text-neutral-600">Scroll: </span>
          <motion.span>{scrollProgressFixed}</motion.span>
        </p>
        <p>
          <span className="text-neutral-600">Triggered: </span>
          <motion.span className="text-cyan-400/80">{triggeredFixed}</motion.span>
        </p>
        <p>
          <span className="text-neutral-600">Linked: </span>
          <motion.span className="text-cyan-400/80">{linkedFixed}</motion.span>
        </p>
        <p>
          <span className="text-neutral-600">Combined: </span>
          <motion.span>{combinedFixed}</motion.span>
        </p>
        <p>
          <span className="text-neutral-600">Active: </span>
          <span>{activeCard + 1}</span>
        </p>
      </div>

      {/* Legend */}
      <div className="fixed bottom-12 left-1/2 flex -translate-x-1/2 gap-6 font-mono text-[10px] text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-0.5 rounded-full bg-neutral-500" />
          Center points (11)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-0.5 rounded-full bg-cyan-600" />
          Trigger points (10×2)
        </span>
      </div>
    </>
  );
};
