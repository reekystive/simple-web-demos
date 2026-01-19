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
      className="absolute left-1/2 flex -translate-x-1/2 flex-col"
      style={{
        y: cardY,
        top: 0,
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
            'flex shrink-0 items-center justify-center rounded-3xl shadow-2xl transition-opacity duration-200',
            'font-bold text-white/90',
            'bg-linear-to-br',
            getCardGradient(i),
            activeCard !== i && 'opacity-30'
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

      {/* Bottom spacer */}
      <div
        className="shrink-0"
        style={{ height: `calc(50vh - ${CARD_HEIGHT_VH / 2}vh - ${CARD_GAP_VH}vh)` }}
        aria-hidden
      />
    </motion.div>
  );
};
