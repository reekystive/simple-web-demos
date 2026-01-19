import { cn } from '@monorepo/utils';
import { motion, MotionValue } from 'motion/react';
import { FC, RefObject } from 'react';
import { CARD_COUNT, CARD_GAP_VH, CARD_HEIGHT_VH, getCardGradient } from './constants.js';

interface CardStackProps {
  contentRef: RefObject<HTMLDivElement | null>;
  cardY: MotionValue<number>;
  activeCard: number;
}

export const CardStack: FC<CardStackProps> = ({ contentRef, cardY, activeCard }) => {
  return (
    <motion.div
      ref={contentRef}
      className="absolute inset-x-0 top-0 flex flex-col items-center"
      style={{
        y: cardY,
        gap: `${CARD_GAP_VH}vh`,
      }}
    >
      {/* Top spacer */}
      <div
        className="shrink-0"
        style={{ height: `calc(50vh - ${CARD_HEIGHT_VH / 2}vh - ${CARD_GAP_VH}vh)` }}
        aria-hidden
      />

      {Array.from({ length: CARD_COUNT }, (_, i) => (
        <div
          key={i}
          className={cn(
            `
              flex w-[calc(100vw-2rem)] max-w-400 shrink-0 items-center justify-center rounded-3xl bg-linear-to-br
              font-bold text-white/90 shadow-2xl transition-opacity duration-200
              lg:w-[calc(100vw-12rem)]
            `,
            getCardGradient(i),
            activeCard !== i && 'opacity-30'
          )}
          style={{
            height: `${CARD_HEIGHT_VH}vh`,
            fontSize: 'clamp(4rem, 15vw, 10rem)',
          }}
        >
          {i + 1}
        </div>
      ))}

      {/* Bottom spacer */}
      <div
        className="shrink-0"
        style={{ height: `calc(50vh - ${CARD_HEIGHT_VH / 2}vh - ${CARD_GAP_VH}vh)` }}
        aria-hidden
      />
    </motion.div>
  );
};
