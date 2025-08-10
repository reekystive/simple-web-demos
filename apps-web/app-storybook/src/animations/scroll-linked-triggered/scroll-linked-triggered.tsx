import { animate } from 'motion';
import { cubicBezier, motion, useMotionValue, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import { FC, useCallback, useLayoutEffect, useRef } from 'react';

export const ScrollLinkedTriggered: FC = () => {
  const debugInfoRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: containerProgress } = useScroll();

  const progress = useTransform(containerProgress, [0, 0.25, 0.75, 1], [0, 0, 1, 1], { clamp: true });

  const linkedPart = useTransform(progress, [0, 1], [0, 1], {
    clamp: true,
    ease: cubicBezier(0.2, 0, 0.8, 1),
  });

  const triggeredPart = useMotionValue(0);

  useMotionValueEvent(progress, 'change', (latestValue) => {
    const previousValue = progress.getPrevious();
    if (previousValue === undefined) {
      return;
    }
    if (latestValue > 0.55 && previousValue <= 0.55) {
      animate(triggeredPart, 1, {
        type: 'spring',
        stiffness: 500,
        damping: 50,
        mass: 0.1,
      });
    }
    if (latestValue < 0.45 && previousValue >= 0.45) {
      animate(triggeredPart, 0, {
        type: 'spring',
        stiffness: 500,
        damping: 50,
        mass: 0.1,
      });
    }
  });

  const combinedProgress = useTransform(() => {
    const finalValue = linkedPart.get() * 0.3 + triggeredPart.get() * 0.7;
    return finalValue;
  });

  const scaleValue = useTransform(combinedProgress, [0, 1], [1, 2], {
    clamp: true,
  });

  const rotationValue = useTransform(combinedProgress, [0, 1], [0, 225]);

  const updateDebugInfo = useCallback((latestValue: number) => {
    if (debugInfoRef.current) {
      debugInfoRef.current.textContent = `Scroll Y Progress: ${latestValue.toFixed(2)}`;
    }
  }, []);

  useLayoutEffect(() => {
    updateDebugInfo(containerProgress.get());
  }, [containerProgress, updateDebugInfo]);

  useMotionValueEvent(containerProgress, 'change', updateDebugInfo);

  return (
    <>
      <div className="relative h-[500vh] w-full">
        <div className="flex h-[100vh] w-full items-center justify-center bg-green-500/10">Scroll down</div>

        <div className="h-[300vh] w-full bg-red-500/10">
          <div className="sticky top-0 flex h-[100vh] w-full flex-row items-center justify-center bg-amber-500/10">
            <motion.div
              className="size-[200px] border-2 border-neutral-500 bg-neutral-500/10"
              style={{ scale: scaleValue, rotate: rotationValue }}
            ></motion.div>
          </div>
        </div>

        <div className="flex h-[100vh] w-full items-center justify-center bg-blue-500/10">The end</div>
      </div>
      <div
        ref={debugInfoRef}
        className={`
          pointer-events-none fixed right-0 bottom-0 left-0 flex flex-col items-center p-2 font-mono text-xs opacity-50
          select-none
        `}
      >
        <p>Loading...</p>
      </div>
    </>
  );
};
