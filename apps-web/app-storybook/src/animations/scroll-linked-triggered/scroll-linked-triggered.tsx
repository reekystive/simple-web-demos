import { cn } from '@monorepo/utils';
import { animate } from 'motion';
import { cubicBezier, motion, useMotionValue, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import { FC, useRef } from 'react';

export const ScrollLinkedTriggered: FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: containerProgress } = useScroll();

  const { scrollYProgress: progress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  const linkedPart = useTransform(progress, [0, 1], [0, 1], {
    clamp: true,
    ease: cubicBezier(0.2, 0, 0.8, 1),
  });

  const triggeredPart = useMotionValue(0);
  const nominalThreshold = 0.5;
  const hysteresisBand = 0.1;

  useMotionValueEvent(progress, 'change', (latestValue) => {
    const previousValue = progress.getPrevious();
    if (previousValue === undefined) {
      return;
    }
    if (latestValue > nominalThreshold + hysteresisBand / 2 && previousValue <= nominalThreshold + hysteresisBand / 2) {
      animate(triggeredPart, 1, {
        type: 'spring',
        stiffness: 500,
        damping: 50,
        mass: 0.1,
      });
    }
    if (latestValue < nominalThreshold - hysteresisBand / 2 && previousValue >= nominalThreshold - hysteresisBand / 2) {
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

  const rotationValue = useTransform(combinedProgress, [0, 1], [0, 180]);

  const containerProgressFixed2 = useTransform(containerProgress, (v) => v.toFixed(2));
  const linkedPartFixed2 = useTransform(linkedPart, (v) => v.toFixed(2));
  const triggeredPartFixed2 = useTransform(triggeredPart, (v) => v.toFixed(2));
  const combinedProgressFixed2 = useTransform(combinedProgress, (v) => v.toFixed(2));

  return (
    <>
      <div className="relative w-full">
        <div className="flex h-[100vh] w-full items-center justify-center bg-green-500/10">Scroll down</div>

        <div className="h-[500vh] w-full bg-red-500/10" ref={sectionRef}>
          <div
            className={`
              sticky top-0 flex h-[100vh] w-full flex-row items-center justify-center overflow-clip bg-amber-500/10
            `}
          >
            <motion.div
              className="size-[200px] border-2 border-neutral-500 bg-neutral-500/10"
              style={{ scale: scaleValue, rotate: rotationValue }}
            ></motion.div>
          </div>
        </div>

        <div className="flex h-[100vh] w-full items-center justify-center bg-blue-500/10">The end</div>
      </div>
      <div
        className={cn(`
          fixed right-0 bottom-2 left-0 grid
          [grid-template-columns:repeat(2,180px)]
          justify-center justify-items-center gap-2 p-2 font-mono text-xs opacity-50 select-none
          md:[grid-template-columns:repeat(4,180px)]
        `)}
      >
        <p>
          <span>Container Linked: </span>
          <motion.span>{containerProgressFixed2}</motion.span>
        </p>
        <p>
          <span>Linked: </span>
          <motion.span>{linkedPartFixed2}</motion.span>
        </p>
        <p>
          <span>Triggered: </span>
          <motion.span>{triggeredPartFixed2}</motion.span>
        </p>
        <p>
          <span>Combined: </span>
          <motion.span>{combinedProgressFixed2}</motion.span>
        </p>
      </div>
    </>
  );
};
