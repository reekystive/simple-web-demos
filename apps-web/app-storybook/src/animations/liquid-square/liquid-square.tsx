import { cn } from '@monorepo/utils';
import { getSvgPath, type FigmaSquircleParams } from 'figma-squircle';
import { motion, PanInfo, useTransform } from 'motion/react';
import { FC, useCallback, useMemo, useState } from 'react';
import { useGrabbingCursor } from './use-grabbing-cursor.js';
import { useLiquidStretch } from './use-liquid-stretch.js';

const baseWidth = 200;
const baseHeight = 200;

const defaultFigmaSquircleParams: FigmaSquircleParams = {
  width: baseWidth,
  height: baseHeight,
  cornerRadius: 24,
  cornerSmoothing: 0.6,
};

export const LiquidSquare: FC<{ className?: string }> = ({ className }) => {
  const d = useMemo(() => getSvgPath(defaultFigmaSquircleParams), []);

  const {
    scaleX,
    scaleY,
    translateX: translateXMV,
    translateY: translateYMV,
    updatePanOffset,
    release,
  } = useLiquidStretch({
    maxStretchX: 1.25,
    maxStretchY: 1.25,
    maxTranslateX: 0.05,
    maxTranslateY: 0.05,
  });

  const translateX = useTransform(() => {
    return translateXMV.get() * baseWidth;
  });

  const translateY = useTransform(() => {
    return translateYMV.get() * baseHeight;
  });

  const [grabbing, setGrabbing] = useState(false);

  useGrabbingCursor(grabbing);

  const handlePanStart = useCallback(() => {
    setGrabbing(true);
  }, []);

  const handlePan = useCallback(
    (_: PointerEvent, info: PanInfo) => {
      const dx = info.offset.x;
      const dy = info.offset.y;
      updatePanOffset(dx / baseWidth, dy / baseHeight);
    },
    [updatePanOffset]
  );

  const handlePanEnd = useCallback(() => {
    setGrabbing(false);
    release();
  }, [release]);

  return (
    <div
      className={cn(
        `mx-auto flex min-h-screen w-screen touch-manipulation flex-col items-center justify-center select-none`,
        className
      )}
    >
      <motion.div
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        style={{ width: baseWidth, height: baseHeight }}
        className={cn(`
          relative cursor-grab touch-none
          active:cursor-grabbing
        `)}
      >
        <div className="pointer-events-none absolute -inset-2 border-4 border-dashed border-neutral-400/50"></div>
        <motion.svg
          width={baseWidth}
          height={baseHeight}
          viewBox={`0 0 ${baseWidth} ${baseHeight}`}
          role="none"
          aria-hidden="true"
          className={cn('absolute inset-0 block')}
          style={{ scaleX, scaleY, translateX, translateY }}
        >
          <path d={d} fill="currentColor" />
        </motion.svg>
      </motion.div>
      <div className="pointer-events-none fixed right-0 bottom-4 left-0 flex flex-col items-stretch gap-2">
        <div
          id="value-red"
          className="relative left-[50%] h-2 w-[0.5%] origin-left bg-red-500"
          style={{ transform: 'scaleX(0)' }}
        ></div>
        <div
          id="value-green"
          className="relative left-[50%] h-2 w-[0.5%] origin-left bg-green-500"
          style={{ transform: 'scaleX(0)' }}
        ></div>
        <div
          id="value-blue"
          className="relative left-[50%] h-2 w-[0.5%] origin-left bg-blue-500"
          style={{ transform: 'scaleX(0)' }}
        ></div>
        <div
          id="value-yellow"
          className="relative left-[50%] h-2 w-[0.5%] origin-left bg-yellow-500"
          style={{ transform: 'scaleX(0)' }}
        ></div>
      </div>
    </div>
  );
};
