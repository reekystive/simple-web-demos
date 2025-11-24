import {
  animate,
  AnimationPlaybackControls,
  MotionValue,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from 'motion/react';
import { useCallback, useMemo, useRef } from 'react';

export interface UseLiquidStretchConfig {
  maxStretchX?: number;
  maxStretchY?: number;
  maxTranslateX?: number;
  maxTranslateY?: number;
}

export interface UseLiquidStretchResult {
  scaleX: MotionValue<number>;
  scaleY: MotionValue<number>;
  translateX: MotionValue<number>;
  translateY: MotionValue<number>;
  updatePanOffset: (offsetX: number, offsetY: number) => void;
  release: () => void;
}

export const expoDecay = (t: number, k = 1.5, A = 1, C = 0): number => {
  return A * Math.exp(-k * t) + C;
};

export const useLiquidStretch = (config: UseLiquidStretchConfig): UseLiquidStretchResult => {
  const { maxStretchX = 1.25, maxStretchY = 1.25, maxTranslateX = 0.1, maxTranslateY = 0.1 } = config;

  if (maxStretchX < 1 || maxStretchY < 1) {
    throw new Error('maxStretchX and maxStretchY must not be less than 1');
  }

  if (maxTranslateX < 0 || maxTranslateY < 0) {
    throw new Error('maxTranslateX and maxTranslateY must not be less than 0');
  }

  const maxAreaGrowth = useMemo(() => {
    return maxStretchX * maxStretchY;
  }, [maxStretchX, maxStretchY]);

  const animatedInputOffsetX = useMotionValue(0);
  const animatedInputOffsetY = useMotionValue(0);

  useMotionValueEvent(animatedInputOffsetX, 'change', (value) => {
    document.getElementById('value-red')?.style.setProperty('transform', `scaleX(${value * 20})`);
  });
  useMotionValueEvent(animatedInputOffsetY, 'change', (value) => {
    document.getElementById('value-green')?.style.setProperty('transform', `scaleX(${value * 20})`);
  });

  const animationControlsXRef = useRef<AnimationPlaybackControls | null>(null);
  const animationControlsYRef = useRef<AnimationPlaybackControls | null>(null);

  const updatePanOffset = useCallback(
    (newOffsetX: number, newOffsetY: number) => {
      const currentXVelocity = animatedInputOffsetX.getVelocity() || 0;
      const currentYVelocity = animatedInputOffsetY.getVelocity() || 0;
      animationControlsXRef.current?.stop();
      animationControlsYRef.current?.stop();
      // https://reekystive.github.io/popmotion-spring-animation/?stiffness=200&mass=0.6&damping=15
      animationControlsXRef.current = animate(animatedInputOffsetX, newOffsetX, {
        type: 'spring',
        stiffness: 200,
        damping: 15,
        mass: 0.6,
        velocity: currentXVelocity,
        restDelta: 0.001,
        restSpeed: 0.01,
      });
      animationControlsYRef.current = animate(animatedInputOffsetY, newOffsetY, {
        type: 'spring',
        stiffness: 200,
        damping: 15,
        mass: 0.6,
        velocity: currentYVelocity,
        restDelta: 0.001,
        restSpeed: 0.01,
      });
    },
    [animatedInputOffsetX, animatedInputOffsetY]
  );

  const release = useCallback(() => {
    const currentVelocityX = animatedInputOffsetX.getVelocity() || 0;
    const currentVelocityY = animatedInputOffsetY.getVelocity() || 0;
    const currentDirectionX = animatedInputOffsetX.get() > 0 ? 1 : -1;
    const currentDirectionY = animatedInputOffsetY.get() > 0 ? 1 : -1;
    const extraVelocityX = currentDirectionX * -5;
    const extraVelocityY = currentDirectionY * -5;
    animationControlsXRef.current?.stop();
    animationControlsYRef.current?.stop();
    // https://reekystive.github.io/popmotion-spring-animation/?stiffness=300&mass=1.5&damping=20
    animationControlsXRef.current = animate(animatedInputOffsetX, 0, {
      type: 'spring',
      stiffness: 500,
      damping: 30,
      mass: 1.5,
      velocity: currentVelocityX + extraVelocityX,
      restDelta: 0.001,
      restSpeed: 0.01,
    });
    animationControlsYRef.current = animate(animatedInputOffsetY, 0, {
      type: 'spring',
      stiffness: 500,
      damping: 30,
      mass: 1.5,
      velocity: currentVelocityY + extraVelocityY,
      restDelta: 0.001,
      restSpeed: 0.01,
    });
  }, [animatedInputOffsetX, animatedInputOffsetY]);

  const rawDistance = useTransform(() => {
    return Math.sqrt(animatedInputOffsetX.get() ** 2 + animatedInputOffsetY.get() ** 2);
  });

  const decayedDistance = useTransform(() => {
    return 1 - expoDecay(rawDistance.get(), 2);
  });

  const area = useTransform(() => {
    return 1 + decayedDistance.get() * (maxAreaGrowth - 1);
  });

  const inputArea = useTransform(() => {
    return (Math.abs(animatedInputOffsetX.get()) + 1) * (Math.abs(animatedInputOffsetY.get()) + 1);
  });

  const areaFactor = useTransform(() => {
    return inputArea.get() / area.get();
  });

  const squareRootAreaFactor = useTransform(() => {
    return Math.pow(areaFactor.get(), 0.5);
  });

  const scaleX = useTransform(() => {
    return (Math.abs(animatedInputOffsetX.get()) + 1) / squareRootAreaFactor.get();
  });

  const scaleY = useTransform(() => {
    return area.get() / scaleX.get();
  });

  const decayedInputOffsetX = useTransform(() => {
    const direction = animatedInputOffsetX.get() > 0 ? 1 : -1;
    return (1 - expoDecay(Math.abs(animatedInputOffsetX.get()), 2)) * direction;
  });

  const decayedInputOffsetY = useTransform(() => {
    const direction = animatedInputOffsetY.get() > 0 ? 1 : -1;
    return (1 - expoDecay(Math.abs(animatedInputOffsetY.get()), 2)) * direction;
  });

  const translateXMove = useTransform(() => {
    return decayedInputOffsetX.get() * maxTranslateX + decayedInputOffsetX.get() * (scaleX.get() - 1);
  });
  const translateYMove = useTransform(() => {
    return decayedInputOffsetY.get() * maxTranslateY + decayedInputOffsetY.get() * (scaleY.get() - 1);
  });

  return {
    scaleX: scaleX,
    scaleY: scaleY,
    translateX: translateXMove,
    translateY: translateYMove,
    updatePanOffset,
    release,
  };
};
