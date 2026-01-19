import { cn } from '@monorepo/utils';
import { FC } from 'react';
import { CardStack } from './card-stack.js';
import { DebugPanel } from './debug-panel.js';
import { SoundToggleButton } from './sound-toggle-button.js';
import { TimelineRuler } from './timeline-ruler.js';
import { useDigitalCrown } from './use-digital-crown.js';

export const DigitalCrown: FC = () => {
  const {
    contentRef,
    placeholderRef,
    scrollProgress,
    triggeredValue,
    linkedValue,
    combinedValue,
    cardY,
    activeCard,
    flashingForward,
    flashingBackward,
    isMuted,
    unmute,
    mute,
  } = useDigitalCrown();

  return (
    <>
      {/* Placeholder for native scroll height */}
      <div ref={placeholderRef} aria-hidden />

      {/* Fixed layer containing the visual content */}
      <div className="fixed inset-0 overflow-hidden">
        <CardStack contentRef={contentRef} cardY={cardY} activeCard={activeCard} />
      </div>

      <div
        className={cn(`
          fixed top-4 right-0 left-0 hidden
          lg:flex lg:flex-col lg:items-center
        `)}
      >
        <TimelineRuler
          scrollProgress={scrollProgress}
          flashingForward={flashingForward}
          flashingBackward={flashingBackward}
        />
      </div>

      {/* Sound toggle button */}
      <div className={cn('fixed top-4 left-4', !isMuted && 'hidden')}>
        <SoundToggleButton isMuted={isMuted} onToggle={isMuted ? unmute : mute} />
      </div>

      <DebugPanel
        scrollProgress={scrollProgress}
        triggeredValue={triggeredValue}
        linkedValue={linkedValue}
        combinedValue={combinedValue}
        activeCard={activeCard}
      />
    </>
  );
};
