/* eslint-disable react-refresh/only-export-components */

import { animate, MotionValue, useMotionValue, useTransform, ValueTransition } from 'motion/react';
import { createContext, FC, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { SPRING_PARAMS } from './constants.js';
import { segmentGraphemes } from './segmenter.js';

export interface SpringBufferContextValue {
  // params
  visualDuration: number;
  setVisualDuration: (v: number) => void;

  // motion values
  contentMV: MotionValue<string>;
  contentGraphemeSegmentsMV: MotionValue<string[]>;
  contentGraphemeLengthMV: MotionValue<number>;
  cursorGraphemeIndexSpringMV: MotionValue<number>;
  cursorUTF16IndexSpringMV: MotionValue<number>;
  renderedValueSpringMV: MotionValue<string>;
  bufferValueSpringMV: MotionValue<string>;

  // actions
  append: (suffix: string) => void;
  flush: () => void;
  clear: () => void;
}

export const useSpringBuffer = (): SpringBufferContextValue => {
  const [visualDuration, setVisualDurationInternal] = useState<number>(SPRING_PARAMS.VISUAL_DURATION.DEFAULT);

  // motion values
  const contentMV = useMotionValue<string>('');
  const contentGraphemeSegmentsMV = useTransform(() => segmentGraphemes(contentMV.get()));
  const contentGraphemeLengthMV = useTransform(() => {
    return contentGraphemeSegmentsMV.get().length;
  });

  // MARK: ANIMATION DRIVER
  const cursorGraphemeIndexSpringMVRaw = useMotionValue<number>(contentGraphemeLengthMV.get());

  // eslint-disable-next-line react-hooks/refs
  contentGraphemeLengthMV.on('change', () =>
    retune({ type: 'spring', bounce: 0, restDelta: 0.1, restSpeed: 0.01, visualDuration: visualDuration })
  );

  const cursorGraphemeIndexSpringMV = useTransform(() => {
    // Math.min(Math.round(cursorGraphemeIndexSpringMVRaw.get()), contentGraphemeLengthMV.get())
    return Math.round(cursorGraphemeIndexSpringMVRaw.get());
  });

  const cursorUTF16IndexSpringMV = useTransform(() => {
    return contentGraphemeSegmentsMV.get().slice(0, cursorGraphemeIndexSpringMV.get()).join('').length;
  });

  const renderedValueSpringMV = useTransform(() => {
    return contentMV.get().slice(0, cursorUTF16IndexSpringMV.get());
  });

  const bufferValueSpringMV = useTransform(() => {
    return contentMV.get().slice(cursorUTF16IndexSpringMV.get());
  });

  // MARK: ACTIONS

  const controlsRef = useRef<ReturnType<typeof animate> | null>(null);

  const retune = useCallback(
    (nextConfig: ValueTransition) => {
      const vel = cursorGraphemeIndexSpringMVRaw.getVelocity() || 0;
      controlsRef.current?.stop();
      controlsRef.current = animate(cursorGraphemeIndexSpringMVRaw, contentGraphemeLengthMV.get(), {
        ...nextConfig,
        velocity: vel, // keep current velocity
      });
    },
    [contentGraphemeLengthMV, cursorGraphemeIndexSpringMVRaw]
  );

  useEffect(() => () => controlsRef.current?.stop(), []);

  const setVisualDuration = useCallback(
    (v: number) => {
      setVisualDurationInternal(v);
      retune({ type: 'spring', bounce: 0, restDelta: 0.1, restSpeed: 0.01, visualDuration: v });
    },
    [retune]
  );

  const append = useCallback(
    (suffix: string) => {
      const newContent = contentMV.get() + suffix;
      contentMV.set(newContent);
    },
    [contentMV]
  );

  const flush = useCallback(() => {
    const vel = cursorGraphemeIndexSpringMVRaw.getVelocity() || 0;
    retune({
      type: 'inertia',
      velocity: vel,
      restDelta: 0.1,
      restSpeed: 0.01,
      timeConstant: 150,
      modifyTarget: () => contentGraphemeLengthMV.get(),
    });
  }, [contentGraphemeLengthMV, cursorGraphemeIndexSpringMVRaw, retune]);

  const clear = useCallback(() => {
    contentMV.jump('');
    contentGraphemeSegmentsMV.jump([]);
    contentGraphemeLengthMV.jump(0);
    cursorGraphemeIndexSpringMVRaw.jump(0);
    cursorGraphemeIndexSpringMV.jump(0);
    cursorUTF16IndexSpringMV.jump(0);
    renderedValueSpringMV.jump('');
    bufferValueSpringMV.jump('');
  }, [
    contentMV,
    contentGraphemeSegmentsMV,
    contentGraphemeLengthMV,
    cursorGraphemeIndexSpringMV,
    cursorUTF16IndexSpringMV,
    renderedValueSpringMV,
    bufferValueSpringMV,
    cursorGraphemeIndexSpringMVRaw,
  ]);

  const value: SpringBufferContextValue = {
    visualDuration,
    setVisualDuration,

    contentMV,
    contentGraphemeSegmentsMV,
    contentGraphemeLengthMV,
    cursorGraphemeIndexSpringMV,
    cursorUTF16IndexSpringMV,
    renderedValueSpringMV,
    bufferValueSpringMV,

    append,
    flush,
    clear,
  };

  return value;
};

const SpringBufferContext = createContext<SpringBufferContextValue | null>(null);

export const useSpringBufferContext = (): SpringBufferContextValue => {
  const context = useContext(SpringBufferContext);
  if (!context) throw new Error('useSpringBuffer must be used within SpringBufferProvider');
  return context;
};

export const SpringBufferProvider: FC<PropsWithChildren<{ value?: SpringBufferContextValue }>> = ({
  children,
  value: initialValue,
}) => {
  const internalValue = useSpringBuffer();
  return <SpringBufferContext.Provider value={initialValue ?? internalValue}>{children}</SpringBufferContext.Provider>;
};
