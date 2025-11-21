import { animate } from 'motion';
import { AnimationPlaybackControls, MotionValue, useMotionValue, useTransform } from 'motion/react';
import { useCallback, useRef } from 'react';

export interface UseLiquidDragConfig {
  /**
   * Maximum stretch amount.
   */
  maxStretch?: number;
}

export interface UseLiquidDragResult {
  pan: MotionValue<number>;
  scale: MotionValue<number>;

  /**
   * Set the pan offset.
   */
  setPan: (normalizedOffset: number) => void;

  /**
   * Release the drag.
   */
  release: () => void;
}

const expo = (r: number, k = 2.5): number => {
  return 1 - Math.exp(-k * Math.max(r, 0));
};

export function useLiquidDrag(config: UseLiquidDragConfig): UseLiquidDragResult {
  const { maxStretch = 1.25 } = config;

  if (maxStretch < 1) {
    throw new Error('maxStretch must be greater than 1');
  }

  // Normalized pan offset relative to the element size.
  const input = useMotionValue(0);

  // Dominant-axis stretch amount in [1, maxStretch).
  const stretch = useTransform(() => {
    const inputAbs = Math.abs(input.get());
    const exponentialStretch = expo((1 + inputAbs * 0.02) / maxStretch, 2.5) * maxStretch;
    console.log('AAA', inputAbs, exponentialStretch);
    return exponentialStretch; // 1 → maxStretch (asymptotic)
  });

  const animateRef = useRef<AnimationPlaybackControls | null>(null);

  const animatedStretch = useMotionValue(stretch.get());

  const setPan = useCallback(
    (normalizedOffset: number) => {
      input.set(normalizedOffset);
      const newStretch = stretch.get();
      const currentVelocity = animatedStretch.getVelocity() || 0;
      animateRef.current?.stop();
      animateRef.current = animate(animatedStretch, newStretch, {
        type: 'spring',
        stiffness: 300,
        damping: 20,
        mass: 0.3,
        velocity: currentVelocity,
        restDelta: 0.001,
        restSpeed: 0.01,
      });
    },
    [animatedStretch, input, stretch]
  );

  const release = useCallback(() => {
    input.set(0);
    animateRef.current?.stop();
    animateRef.current = animate(animatedStretch, 1, {
      type: 'spring',
      stiffness: 120,
      damping: 10,
      mass: 0.6,
      velocity: animatedStretch.get() * -5,
      restDelta: 0.001,
      restSpeed: 0.01,
    });
  }, [animatedStretch, input]);

  return { pan: new MotionValue(0), scale: animatedStretch, setPan, release };
}
