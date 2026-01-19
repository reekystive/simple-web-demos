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
  flashingForward: Set<number>;
  flashingBackward: Set<number>;

  // Audio
  isMuted: boolean;
  unmute: () => Promise<void>;
  mute: () => void;

  // Utilities
  getTotalScrollHeight: () => number;
}

export function useDigitalCrown(): DigitalCrownState {
  const contentRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [flashingForward, setFlashingForward] = useState<Set<number>>(new Set());
  const [flashingBackward, setFlashingBackward] = useState<Set<number>>(new Set());
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

  // Handle trigger detection - optimized for crossing multiple triggers in one frame
  useMotionValueEvent(scrollProgress, 'change', (progress) => {
    const previousProgress = scrollProgress.getPrevious();
    if (previousProgress === undefined) return;

    const segmentSize = 1 / TRIGGER_COUNT;
    const currentDetent = currentDetentRef.current;
    let newDetent = currentDetent;
    const crossedTriggers: number[] = [];
    let direction: 'forward' | 'backward' | null = null;

    if (progress > previousProgress) {
      // Scrolling forward (down) - collect all crossed triggers
      for (let i = currentDetent; i < TRIGGER_COUNT; i++) {
        const segmentStart = i * segmentSize;
        const triggerHigh = segmentStart + segmentSize * TRIGGER_ZONE_HIGH;
        if (progress > triggerHigh) {
          newDetent = i + 1;
          crossedTriggers.push(i);
          direction = 'forward';
        } else {
          break;
        }
      }
    } else if (progress < previousProgress) {
      // Scrolling backward (up) - collect all crossed triggers
      for (let i = currentDetent - 1; i >= 0; i--) {
        const segmentStart = i * segmentSize;
        const triggerLow = segmentStart + segmentSize * TRIGGER_ZONE_LOW;
        if (progress < triggerLow) {
          newDetent = i;
          crossedTriggers.push(i);
          direction = 'backward';
        } else {
          break;
        }
      }
    }

    // Only update if we actually crossed triggers
    if (newDetent !== currentDetent && crossedTriggers.length > 0) {
      currentDetentRef.current = newDetent;
      triggeredIndex.set(newDetent);
      setActiveCard(newDetent);

      // Flash all crossed triggers
      if (direction === 'forward') {
        setFlashingForward(new Set(crossedTriggers));
        setTimeout(() => setFlashingForward(new Set()), 200);
      } else {
        setFlashingBackward(new Set(crossedTriggers));
        setTimeout(() => setFlashingBackward(new Set()), 200);
      }

      playTick();
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
