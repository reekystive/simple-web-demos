import { cubicBezier, motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import { FC, useCallback, useLayoutEffect, useRef } from 'react';

export const ScrollLinkedTriggered: FC = () => {
  const debugInfoRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();

  const targetRegionProgress = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0, 0, 1, 1], { clamp: true });
  const scale = useTransform(targetRegionProgress, [0, 1], [1, 2], { clamp: true });
  const scaleEased = useTransform(scale, [1, 2], [1, 2], {
    ease: cubicBezier(0.7, 0, 0.7, 1),
  });

  const updateDebugInfo = useCallback((latestValue: number) => {
    if (debugInfoRef.current) {
      debugInfoRef.current.textContent = `Scroll Y Progress: ${latestValue.toFixed(2)}`;
    }
  }, []);

  useLayoutEffect(() => {
    updateDebugInfo(scrollYProgress.get());
  }, [scrollYProgress, updateDebugInfo]);

  useMotionValueEvent(scrollYProgress, 'change', updateDebugInfo);

  return (
    <>
      <div className="relative h-[500vh] w-full">
        <div className="flex h-[100vh] w-full items-center justify-center bg-green-500/10">Scroll down</div>

        <div className="h-[300vh] w-full bg-red-500/10">
          <div className="sticky top-0 flex h-[100vh] w-full flex-row items-center justify-center bg-amber-500/10">
            <motion.div className="size-[200px] bg-neutral-500" style={{ scale: scaleEased }}></motion.div>
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
