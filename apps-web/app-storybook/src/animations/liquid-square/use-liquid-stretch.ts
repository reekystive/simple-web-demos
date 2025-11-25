import { MotionValue, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useCallback } from 'react';
import { expDecayGaussian } from './decay.js';
import { toTranslateThenScale } from './transform-utils.js';

export interface UseLiquidStretchConfig {
  maxMoveX?: number;
  maxMoveY?: number;
  maxStretchX?: number;
  maxStretchY?: number;
}

export interface UseLiquidStretchResult {
  normalizedTranslateX: MotionValue<number>;
  normalizedTranslateY: MotionValue<number>;
  translateX: MotionValue<string>;
  translateY: MotionValue<string>;
  scaleX: MotionValue<number>;
  scaleY: MotionValue<number>;
  updateNormalizedPanOffset: (normalizedOffsetX: number, normalizedOffsetY: number) => void;
  release: () => void;
}

/**
 * Hook for creating a liquid stretch effect.
 *
 * **Important**: When using the returned values, you must apply transforms in this order:
 *
 * 1. First apply `translate` (translateX, translateY)
 * 2. Then apply `scale` (scaleX, scaleY)
 *
 * Internally, the calculations are based on the assumption that scale is applied first,
 * then translate. However, the returned values are converted to work with the
 * translate-first, scale-second transform order.
 */
export const useLiquidStretch = (config: UseLiquidStretchConfig = {}): UseLiquidStretchResult => {
  const { maxStretchX = 0.25, maxStretchY = 0.25, maxMoveX = 0.1, maxMoveY = 0.1 } = config;

  if (maxStretchX < 0 || maxStretchY < 0) {
    throw new Error('maxStretchX and maxStretchY must not be less than 0');
  }

  if (maxMoveX < 0 || maxMoveY < 0) {
    throw new Error('maxMoveX and maxMoveY must not be less than 0');
  }

  const inputOffsetX = useMotionValue(0);
  const inputOffsetY = useMotionValue(0);

  const updatePanOffset = useCallback(
    (newOffsetX: number, newOffsetY: number) => {
      inputOffsetX.set(newOffsetX);
      inputOffsetY.set(newOffsetY);
    },
    [inputOffsetX, inputOffsetY]
  );

  const release = useCallback(() => {
    inputOffsetX.set(0);
    inputOffsetY.set(0);
  }, [inputOffsetX, inputOffsetY]);

  const distance = useTransform(() => {
    return Math.sqrt(inputOffsetX.get() ** 2 + inputOffsetY.get() ** 2);
  });

  const decayedDistance = useTransform(() => {
    // return 1 - expoDecay(distance.get(), 0.3);
    return 1 - expDecayGaussian(distance.get(), 0.1);
  });

  const decayRatio = useTransform(() => {
    if (Math.abs(distance.get()) < 0.001) {
      return 0;
    }
    return decayedDistance.get() / distance.get();
  });

  const decayedOffsetX = useTransform(() => {
    return inputOffsetX.get() * decayRatio.get();
  });
  const decayedOffsetY = useTransform(() => {
    return inputOffsetY.get() * decayRatio.get();
  });

  const animatedDecayedOffsetX = useSpring(decayedOffsetX, {
    stiffness: 300,
    damping: 15,
    mass: 0.6,
    restDelta: 0.001,
    restSpeed: 0.01,
  });
  const animatedDecayedOffsetY = useSpring(decayedOffsetY, {
    stiffness: 300,
    damping: 15,
    mass: 0.6,
    restDelta: 0.001,
    restSpeed: 0.01,
  });

  const deltaScaleX = useTransform(() => {
    return animatedDecayedOffsetX.get() * maxStretchX;
  });
  const deltaScaleY = useTransform(() => {
    return animatedDecayedOffsetY.get() * maxStretchY;
  });

  const scaleX = useTransform(() => {
    return 1 + Math.abs(deltaScaleX.get());
  });
  const scaleY = useTransform(() => {
    return 1 + Math.abs(deltaScaleY.get());
  });

  const translateX = useTransform(() => {
    return deltaScaleX.get() / 2;
  });
  const translateY = useTransform(() => {
    return deltaScaleY.get() / 2;
  });

  const extraTranslateX = useTransform(() => {
    return maxMoveX * animatedDecayedOffsetX.get();
  });
  const extraTranslateY = useTransform(() => {
    return maxMoveY * animatedDecayedOffsetY.get();
  });

  const correctedTranslateX = useTransform(() => {
    return toTranslateThenScale({ scale: scaleX.get(), translate: translateX.get() + extraTranslateX.get() })
      .preTranslate;
  });
  const correctedTranslateY = useTransform(() => {
    return toTranslateThenScale({ scale: scaleY.get(), translate: translateY.get() + extraTranslateY.get() })
      .preTranslate;
  });

  const correctedTranslateXPercent = useTransform(() => {
    return `${correctedTranslateX.get() * 100}%`;
  });
  const correctedTranslateYPercent = useTransform(() => {
    return `${correctedTranslateY.get() * 100}%`;
  });

  return {
    scaleX,
    scaleY,
    normalizedTranslateX: correctedTranslateX,
    normalizedTranslateY: correctedTranslateY,
    translateX: correctedTranslateXPercent,
    translateY: correctedTranslateYPercent,
    updateNormalizedPanOffset: updatePanOffset,
    release,
  };
};
