import { FC } from 'react';
import { CardStack } from './card-stack.js';
import { DebugPanel } from './debug-panel.js';
import { TimelineRuler } from './timeline-ruler.js';
import { useDigitalCrown } from './use-digital-crown.js';

export const DigitalCrown: FC = () => {
  const {
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
  } = useDigitalCrown();

  return (
    <>
      {/* Placeholder for native scroll height */}
      <div ref={placeholderRef} aria-hidden />

      {/* Fixed layer containing the visual content */}
      <div className="fixed inset-0 overflow-hidden">
        <TimelineRuler
          scrollProgress={scrollProgress}
          flashingForward={flashingForward}
          flashingBackward={flashingBackward}
        />

        <CardStack contentRef={contentRef} cardY={cardY} activeCard={activeCard} />
      </div>

      <DebugPanel
        scrollProgress={scrollProgress}
        triggeredIndex={triggeredIndex}
        linkedValue={linkedValue}
        combinedValue={combinedValue}
        activeCard={activeCard}
      />
    </>
  );
};
