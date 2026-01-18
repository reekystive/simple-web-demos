import { cn } from '@monorepo/utils';
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'motion/react';
import { FC, useCallback, useLayoutEffect, useRef, useState } from 'react';

const CARD_COUNT = 11;
const TRIGGER_COUNT = CARD_COUNT - 1; // 10 trigger points between 11 cards
const CARD_HEIGHT_VH = 70;
const CARD_GAP_VH = 5;
const CARD_UNIT_VH = CARD_HEIGHT_VH + CARD_GAP_VH; // 75vh per card

// Trigger zone within each 10% segment (relative to segment, so 0.4-0.6 means 4%-6% of the 10% segment)
const TRIGGER_ZONE_LOW = 0.4; // 4% of segment = 40% within segment
const TRIGGER_ZONE_HIGH = 0.6; // 6% of segment = 60% within segment

export const DigitalCrown: FC = () => {
  const contentRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [flashingForward, setFlashingForward] = useState<number | null>(null);
  const [flashingBackward, setFlashingBackward] = useState<number | null>(null);

  const { scrollY } = useScroll();

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

  // Triggered part - which "detent" we're at (0-9), with spring animation
  const triggeredIndex = useSpring(0, {
    stiffness: 400,
    damping: 40,
    mass: 0.2,
  });

  // Track for hysteresis
  const currentDetentRef = useRef(0);

  useMotionValueEvent(scrollProgress, 'change', (progress) => {
    const previousProgress = scrollProgress.getPrevious();
    if (previousProgress === undefined) return;

    const segmentSize = 1 / TRIGGER_COUNT; // 10% = 0.1

    for (let i = 0; i < TRIGGER_COUNT; i++) {
      const segmentStart = i * segmentSize;
      // Convert relative trigger zones to absolute positions
      const triggerLow = segmentStart + segmentSize * TRIGGER_ZONE_LOW;
      const triggerHigh = segmentStart + segmentSize * TRIGGER_ZONE_HIGH;

      // Forward trigger: crossing triggerHigh upward (scrolling down)
      if (progress > triggerHigh && previousProgress <= triggerHigh && currentDetentRef.current <= i) {
        currentDetentRef.current = i + 1;
        triggeredIndex.set(Math.min(i + 1, TRIGGER_COUNT));
        setFlashingForward(i);
        setTimeout(() => setFlashingForward(null), 200);
      }

      // Backward trigger: crossing triggerLow downward (scrolling up)
      if (progress < triggerLow && previousProgress >= triggerLow && currentDetentRef.current > i) {
        currentDetentRef.current = i;
        triggeredIndex.set(i);
        setFlashingBackward(i);
        setTimeout(() => setFlashingBackward(null), 200);
      }
    }
  });

  // Linked part - continuous value from 0 to TRIGGER_COUNT, i.e., 0-10 (monotonic)
  // This matches triggered range so combined value correctly maps to card positions
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

  // Update placeholder height
  const updatePlaceholderHeight = useCallback((newHeight: number) => {
    const placeholder = placeholderRef.current;
    if (!placeholder) return;
    placeholder.style.height = `${newHeight}px`;
  }, []);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const handleResize = () => {
      const vh = window.innerHeight / 100;
      // Placeholder = totalScrollHeight + viewport height
      // So max scrollY = placeholder - viewport = totalScrollHeight
      const totalHeight = TRIGGER_COUNT * CARD_UNIT_VH * vh + window.innerHeight;
      updatePlaceholderHeight(totalHeight);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [updatePlaceholderHeight]);

  // Combined value for display
  const combinedValue = useTransform(() => {
    const triggered = triggeredIndex.get();
    const linked = linkedValue.get();
    return triggered * 0.8 + linked * 0.2;
  });

  // Debug values
  const scrollProgressFixed = useTransform(scrollProgress, (v) => (v * 100).toFixed(1) + '%');
  const triggeredFixed = useTransform(triggeredIndex, (v) => v.toFixed(2));
  const linkedFixed = useTransform(linkedValue, (v) => v.toFixed(2));
  const combinedFixed = useTransform(combinedValue, (v) => v.toFixed(2));

  return (
    <>
      {/* Placeholder for native scroll height */}
      <div ref={placeholderRef} aria-hidden />

      {/* Fixed layer containing the visual content */}
      <div className="fixed inset-0 overflow-hidden">
        {/* Timeline ruler at top */}
        <div className="absolute top-6 left-1/2 z-10 -translate-x-1/2">
          <div className="relative flex h-10 w-[85vw] items-center rounded-full bg-neutral-900/80 px-4 backdrop-blur-sm">
            {/* 11 center points (detent positions) - where each card is centered */}
            {Array.from({ length: CARD_COUNT }, (_, i) => {
              const position = (i / TRIGGER_COUNT) * 100; // 0%, 10%, 20%, ..., 100%
              return (
                <div key={`center-${i}`}>
                  <div
                    className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-500"
                    style={{ left: `calc(${position}% * 0.92 + 4%)` }}
                    title={`Card ${i + 1} centered: ${position.toFixed(0)}%`}
                  />
                  {/* Center point label */}
                  <div
                    className="absolute top-full mt-1 -translate-x-1/2 font-mono text-[10px] text-neutral-500"
                    style={{ left: `calc(${position}% * 0.92 + 4%)` }}
                  >
                    {i + 1}
                  </div>
                </div>
              );
            })}

            {/* 10 segments with trigger zones */}
            {Array.from({ length: TRIGGER_COUNT }, (_, i) => {
              const segmentStart = (i / TRIGGER_COUNT) * 100;
              const segmentEnd = ((i + 1) / TRIGGER_COUNT) * 100;
              const triggerLow = segmentStart + (segmentEnd - segmentStart) * TRIGGER_ZONE_LOW;
              const triggerHigh = segmentStart + (segmentEnd - segmentStart) * TRIGGER_ZONE_HIGH;

              return (
                <div key={`trigger-${i}`}>
                  {/* Trigger zone background */}
                  <div
                    className="absolute top-1/2 h-4 -translate-y-1/2 rounded-sm bg-neutral-700/30"
                    style={{
                      left: `calc(${triggerLow}% * 0.92 + 4%)`,
                      width: `calc(${triggerHigh - triggerLow}% * 0.92)`,
                    }}
                  />
                  {/* Backward trigger point (triggerLow) */}
                  <div
                    className={cn(
                      'absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200',
                      flashingBackward === i ? 'scale-y-150 bg-cyan-300' : 'bg-cyan-600'
                    )}
                    style={{ left: `calc(${triggerLow}% * 0.92 + 4%)` }}
                    title={`Backward trigger: ${triggerLow.toFixed(1)}%`}
                  />
                  {/* Forward trigger point (triggerHigh) */}
                  <div
                    className={cn(
                      'absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200',
                      flashingForward === i ? 'scale-y-150 bg-cyan-300' : 'bg-cyan-600'
                    )}
                    style={{ left: `calc(${triggerHigh}% * 0.92 + 4%)` }}
                    title={`Forward trigger: ${triggerHigh.toFixed(1)}%`}
                  />
                </div>
              );
            })}

            {/* Current scroll position indicator */}
            <motion.div
              className="absolute top-1/2 h-7 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg shadow-white/30"
              style={{
                left: useTransform(scrollProgress, (v) => `calc(${v * 100}% * 0.92 + 4%)`),
              }}
            />
          </div>
        </div>

        {/* Cards container */}
        <motion.div
          ref={contentRef}
          className="absolute left-1/2 flex -translate-x-1/2 flex-col"
          style={{
            y: cardY,
            top: 0,
            gap: `${CARD_GAP_VH}vh`,
          }}
        >
          {/* Top spacer - ensures first card is centered at scroll start */}
          {/* Height = center offset - half card height - gap (since gap is added after spacer) */}
          <div
            className="shrink-0"
            style={{ height: `calc(50vh - ${CARD_HEIGHT_VH / 2}vh - ${CARD_GAP_VH}vh)` }}
            aria-hidden
          />

          {Array.from({ length: CARD_COUNT }, (_, i) => (
            <div
              key={i}
              className={cn(
                'flex shrink-0 items-center justify-center rounded-3xl shadow-2xl',
                'font-bold text-white/90',
                'bg-gradient-to-br',
                getCardGradient(i)
              )}
              style={{
                width: '65vw',
                height: `${CARD_HEIGHT_VH}vh`,
                fontSize: 'clamp(4rem, 15vw, 10rem)',
              }}
            >
              {i + 1}
            </div>
          ))}

          {/* Bottom spacer - ensures last card is centered at scroll end */}
          {/* Height = center offset - half card height - gap (since gap is added before spacer) */}
          <div
            className="shrink-0"
            style={{ height: `calc(50vh - ${CARD_HEIGHT_VH / 2}vh - ${CARD_GAP_VH}vh)` }}
            aria-hidden
          />
        </motion.div>
      </div>

      {/* Debug info */}
      <div
        className={cn(`
          fixed bottom-4 left-1/2 grid -translate-x-1/2 select-none
          gap-x-6 gap-y-1 font-mono text-xs text-neutral-400
          [grid-template-columns:repeat(2,auto)]
          md:[grid-template-columns:repeat(4,auto)]
        `)}
      >
        <p>
          <span className="text-neutral-600">Scroll: </span>
          <motion.span>{scrollProgressFixed}</motion.span>
        </p>
        <p>
          <span className="text-neutral-600">Triggered: </span>
          <motion.span className="text-cyan-400/80">{triggeredFixed}</motion.span>
        </p>
        <p>
          <span className="text-neutral-600">Linked: </span>
          <motion.span className="text-cyan-400/80">{linkedFixed}</motion.span>
        </p>
        <p>
          <span className="text-neutral-600">Combined: </span>
          <motion.span>{combinedFixed}</motion.span>
        </p>
      </div>

      {/* Legend */}
      <div className="fixed bottom-12 left-1/2 flex -translate-x-1/2 gap-4 font-mono text-[10px] text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-0.5 rounded-full bg-neutral-500" />
          Center points (11)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-0.5 rounded-full bg-cyan-600" />
          Trigger points (10×2)
        </span>
      </div>
    </>
  );
};

function getCardGradient(index: number): string {
  const gradients = [
    'from-rose-500 to-pink-600',
    'from-orange-500 to-amber-600',
    'from-yellow-500 to-lime-600',
    'from-emerald-500 to-teal-600',
    'from-cyan-500 to-sky-600',
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-fuchsia-500 to-pink-600',
    'from-slate-500 to-zinc-600',
    'from-red-500 to-rose-600',
    'from-amber-500 to-orange-600',
  ];
  return gradients[index % gradients.length]!;
}
