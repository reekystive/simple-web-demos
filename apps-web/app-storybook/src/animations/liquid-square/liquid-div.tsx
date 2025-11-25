import { cn } from '@monorepo/utils';
import { PanInfo } from 'motion';
import { HTMLMotionProps, motion } from 'motion/react';
import { FC, useCallback, useRef, useState } from 'react';
import { useGrabbingCursor } from './use-grabbing-cursor.js';
import { useLiquidStretch, UseLiquidStretchConfig } from './use-liquid-stretch.js';

interface LiquidDivConfig extends UseLiquidStretchConfig {
  disableDraggingCursor?: boolean;
}

interface LiquidDivProps extends HTMLMotionProps<'div'> {
  liquidConfig?: LiquidDivConfig;
}

export const LiquidDiv: FC<LiquidDivProps> = (props) => {
  const { className, children, liquidConfig = {}, style, ...restProps } = props;
  const { disableDraggingCursor = false, ...restLiquidConfig } = liquidConfig;

  const containerRef = useRef<HTMLDivElement>(null);

  const { translateX, translateY, scaleX, scaleY, updateNormalizedPanOffset, release } =
    useLiquidStretch(restLiquidConfig);

  const [grabbing, setGrabbing] = useState(false);

  useGrabbingCursor(!disableDraggingCursor ? grabbing : false);

  const handlePanStart = useCallback(() => {
    setGrabbing(true);
  }, []);

  const handlePan = useCallback(
    (_: PointerEvent, info: PanInfo) => {
      const container = containerRef.current;
      if (!container) return;
      console.log(container.clientWidth, container.clientHeight);
      const dx = info.offset.x;
      const dy = info.offset.y;
      updateNormalizedPanOffset(dx / container.clientWidth, dy / container.clientHeight);
    },
    [updateNormalizedPanOffset]
  );

  const handlePanEnd = useCallback(() => {
    setGrabbing(false);
    release();
  }, [release]);

  return (
    <motion.div
      {...restProps}
      ref={containerRef}
      onPanStart={handlePanStart}
      onPan={handlePan}
      onPanEnd={handlePanEnd}
      className={cn(
        `touch-none`,
        !disableDraggingCursor &&
          `
            cursor-grab
            active:cursor-grabbing
          `,
        className
      )}
      style={{ ...style, translateX, translateY, scaleX, scaleY }}
    >
      {children}
    </motion.div>
  );
};
