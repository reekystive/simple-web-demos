import { MotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from 'motion/react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { CARD_UNIT_VH, TRIGGER_COUNT, TRIGGER_ZONE_HIGH, TRIGGER_ZONE_LOW } from './constants.js';
import { useTickSound } from './use-tick-sound.js';

export interface DigitalCrownState {
  // Refs
  contentRef: React.RefObject<HTMLDivElement | null>;
  placeholderRef: React.RefObject<HTMLDivElement | null>;

  // Motion values
  scrollProgress: MotionValue<number>;
  triggeredIndex: MotionValue<number>;
  linkedValue: MotionValue<number>;
  combinedValue: MotionValue<number>;
  cardY: MotionValue<number>;

  // State
  activeCard: number;
  flashingForward: number | null;
  flashingBackward: number | null;

  // Audio
  isMuted: boolean;
  unmute: () => void;
  mute: () => void;

  // Utilities
  getTotalScrollHeight: () => number;
}

export function useDigitalCrown(): DigitalCrownState {
  const contentRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [flashingForward, setFlashingForward] = useState<number | null>(null);
  const [flashingBackward, setFlashingBackward] = useState<number | null>(null);
  const [activeCard, setActiveCard] = useState(0);

  const { scrollY } = useScroll();
  const { playTick, isMuted, unmute, mute } = useTickSound();

  // Calculate total scroll height (TRIGGER_COUNT segments worth of scrolling)
  const getTotalScrollHeight = useCallback(() => {
    const vh = window.innerHeight / 100;
    return TRIGGER_COUNT * CARD_UNIT_VH * vh;
  }, []);

  // Normalize scroll position to 0-1 range
  const scrollProgress = useTransform(scrollY, (value) => {
    const totalHeight = getTotalScrollHeight();
    return Math.min(Math.max(value / totalHeight, 0), 1);
  });

  // Triggered part - which "detent" we're at (0-10), with spring animation
  const triggeredIndex = useSpring(0, {
    stiffness: 400,
    damping: 40,
    mass: 0.2,
  });

  // Track for hysteresis
  const currentDetentRef = useRef(0);

  // Handle trigger detection
  useMotionValueEvent(scrollProgress, 'change', (progress) => {
    const previousProgress = scrollProgress.getPrevious();
    if (previousProgress === undefined) return;

    const segmentSize = 1 / TRIGGER_COUNT;

    for (let i = 0; i < TRIGGER_COUNT; i++) {
      const segmentStart = i * segmentSize;
      const triggerLow = segmentStart + segmentSize * TRIGGER_ZONE_LOW;
      const triggerHigh = segmentStart + segmentSize * TRIGGER_ZONE_HIGH;

      // Forward trigger: crossing triggerHigh upward (scrolling down)
      if (progress > triggerHigh && previousProgress <= triggerHigh && currentDetentRef.current <= i) {
        currentDetentRef.current = i + 1;
        triggeredIndex.set(Math.min(i + 1, TRIGGER_COUNT));
        setActiveCard(Math.min(i + 1, TRIGGER_COUNT));
        setFlashingForward(i);
        setTimeout(() => setFlashingForward(null), 200);
        playTick();
      }

      // Backward trigger: crossing triggerLow downward (scrolling up)
      if (progress < triggerLow && previousProgress >= triggerLow && currentDetentRef.current > i) {
        currentDetentRef.current = i;
        triggeredIndex.set(i);
        setActiveCard(i);
        setFlashingBackward(i);
        setTimeout(() => setFlashingBackward(null), 200);
        playTick();
      }
    }
  });

  // Linked part - continuous value from 0 to TRIGGER_COUNT (monotonic)
  const linkedValue = useTransform(scrollProgress, (value) => {
    return value * TRIGGER_COUNT;
  });

  // Combined Y position for cards
  const cardY = useTransform(() => {
    const vh = window.innerHeight / 100;
    const triggered = triggeredIndex.get();
    const linked = linkedValue.get();
    // Triggered contributes 0.8h, linked contributes 0.2h
    const totalCardUnits = triggered * 0.8 + linked * 0.2;
    return -totalCardUnits * CARD_UNIT_VH * vh;
  });

  // Combined value for display
  const combinedValue = useTransform(() => {
    const triggered = triggeredIndex.get();
    const linked = linkedValue.get();
    return triggered * 0.8 + linked * 0.2;
  });

  // Update placeholder height on resize
  useLayoutEffect(() => {
    const updatePlaceholderHeight = () => {
      const placeholder = placeholderRef.current;
      if (!placeholder) return;
      const vh = window.innerHeight / 100;
      const totalHeight = TRIGGER_COUNT * CARD_UNIT_VH * vh + window.innerHeight;
      placeholder.style.height = `${totalHeight}px`;
    };

    window.addEventListener('resize', updatePlaceholderHeight);
    updatePlaceholderHeight();

    return () => {
      window.removeEventListener('resize', updatePlaceholderHeight);
    };
  }, []);

  return {
    contentRef,
    placeholderRef,
    scrollProgress,
    triggeredIndex,
    linkedValue,
    combinedValue,
    cardY,
    activeCard,
    flashingForward,
    flashingBackward,
    isMuted,
    unmute,
    mute,
    getTotalScrollHeight,
  };
}
