import { cn } from '@monorepo/utils';
import { getSvgPath, type FigmaSquircleParams } from 'figma-squircle';
import { motion, PanInfo, useTransform } from 'motion/react';
import { FC, useCallback, useMemo, useState } from 'react';
import { useGrabbingCursor } from './use-grabbing-cursor.js';
import { useLiquidDrag } from './use-liquid-drag.js';

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
    scale: scaleX,
    setPan: setPanX,
    release: releaseX,
  } = useLiquidDrag({
    maxStretch: 1.25,
  });

  const scaleYMV = useTransform(scaleX, (scale) => 1 / scale);

  const [grabbing, setGrabbing] = useState(false);

  useGrabbingCursor(grabbing);

  const handlePanStart = useCallback(() => {
    setGrabbing(true);
  }, []);

  const handlePan = useCallback(
    (_: PointerEvent, info: PanInfo) => {
      const dx = Math.abs(info.offset.x);
      setPanX(dx);
    },
    [setPanX]
  );

  const handlePanEnd = useCallback(() => {
    setGrabbing(false);
    releaseX();
  }, [releaseX]);

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
        <motion.svg
          width={baseWidth}
          height={baseHeight}
          viewBox={`0 0 ${baseWidth} ${baseHeight}`}
          role="none"
          aria-hidden="true"
          className={cn('absolute inset-0 block')}
          style={{ scaleX, scaleY: scaleYMV }}
        >
          <path d={d} fill="currentColor" />
        </motion.svg>
      </motion.div>
    </div>
  );
};
