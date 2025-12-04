import { ImageWithState } from '#src/animations/eager-layout/image-with-state.js';
import { Button } from '#src/components/button/button.js';
import { cn } from '@monorepo/utils';
import { motion, useMotionValue } from 'motion/react';
import { FC, useMemo, useState } from 'react';
import landscapeImageUrl from './assets/landscape.webp';
import { drawGridImage } from './draw-grid.js';
import { drawDisplacementMap } from './draw-map.js';

export const SvgDisplacementMap: FC = () => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const displacementMap = useMemo(() => drawDisplacementMap(), []);
  const gridImage = useMemo(() => drawGridImage(), []);

  const [type, setType] = useState<'landscape' | 'grid'>('landscape');
  const [showRedOverlay, setShowRedOverlay] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2">
      <SvgDefs className="absolute" displacementMapUrl={displacementMap?.dataUrl} />

      <h2 className="-mb-1 text-xl">SVG Displacement Map</h2>
      <p className="pb-6 text-sm">Drag the square in second image to see the displacement effects.</p>

      <div className={`flex flex-row gap-2 overflow-clip px-2 select-none`}>
        <Button
          size="sm"
          color={type === 'landscape' ? 'green' : 'yellow'}
          allPossibleContents={['Switch to landscape image', 'Switch to grid image']}
          onClick={() => setType((prev) => (prev === 'landscape' ? 'grid' : 'landscape'))}
          className="px-2"
        >
          {type === 'landscape' ? 'Switch to grid image' : 'Switch to landscape image'}
        </Button>

        <Button
          size="sm"
          color={showRedOverlay ? 'yellow' : 'green'}
          allPossibleContents={['Show red overlay', 'Hide red overlay']}
          onClick={() => setShowRedOverlay((prev) => !prev)}
          className="px-2"
        >
          {showRedOverlay ? 'Hide red overlay' : 'Show red overlay'}
        </Button>
      </div>

      <div className={`flex flex-row gap-8 overflow-clip p-4 select-none`}>
        <img
          className="w-30 min-w-0 object-contain"
          src={displacementMap?.dataUrl}
          style={{
            aspectRatio: (displacementMap?.width ?? 1) / (displacementMap?.height ?? 1),
            filter: 'url(#r-channel-only)',
          }}
          alt="Displacement map (R channel)"
        />
        <img
          className="w-30 min-w-0 object-contain"
          src={displacementMap?.dataUrl}
          style={{
            aspectRatio: (displacementMap?.width ?? 1) / (displacementMap?.height ?? 1),
            filter: 'url(#g-channel-only)',
          }}
          alt="Displacement map (G channel)"
        />
        <img
          className="w-30 min-w-0 object-contain"
          src={displacementMap?.dataUrl}
          style={{
            aspectRatio: (displacementMap?.width ?? 1) / (displacementMap?.height ?? 1),
          }}
          alt="Displacement Map (original)"
        />
      </div>

      <div
        className={`
          flex flex-col gap-4 p-4 select-none
          md:flex-row md:gap-8
        `}
      >
        <div className="relative">
          <ImageWithState
            src={type === 'landscape' ? landscapeImageUrl : gridImage?.imageUrl}
            alt="Landscape nature field tree"
            draggable={false}
            className="aspect-square w-80 object-cover"
          />
          <motion.img
            src={displacementMap?.dataUrl}
            draggable={false}
            className="absolute size-30 rounded-full object-cover opacity-60"
            style={{
              x,
              y,
              top: '50%',
              left: '50%',
              translateX: '-50%',
              translateY: '-50%',
            }}
          />
        </div>

        <div className="relative">
          <ImageWithState
            src={type === 'landscape' ? landscapeImageUrl : gridImage?.imageUrl}
            alt="Landscape nature field tree"
            draggable={false}
            className="aspect-square w-80 object-cover"
          />
          <motion.div
            className={cn('absolute size-30 rounded-full', showRedOverlay && 'bg-red-600/10')}
            drag
            dragConstraints={{ left: 0, top: 0, right: 0, bottom: 0 }}
            style={{
              x,
              y,
              top: '50%',
              left: '50%',
              translateX: '-50%',
              translateY: '-50%',
              backdropFilter: 'url(#displacement-map-filter)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

const SvgDefs: FC<{ className?: string; displacementMapUrl?: string }> = ({ className, displacementMapUrl }) => {
  return (
    <svg className={cn(className)} width="0" height="0">
      <defs>
        <filter id="r-channel-only">
          <feColorMatrix
            type="matrix"
            values={`
            1 0 0 0 0
            0 0 0 0 0
            0 0 0 0 0
            0 0 0 0 1
          `}
          />
        </filter>

        <filter id="g-channel-only">
          <feColorMatrix
            type="matrix"
            values={`
            0 0 0 0 0
            0 1 0 0 0
            0 0 0 0 0
            0 0 0 0 1
          `}
          />
        </filter>

        <filter id="b-channel-only">
          <feColorMatrix
            type="matrix"
            values={`
            0 0 0 0 0
            0 0 0 0 0
            0 0 1 0 0
            0 0 0 0 1
          `}
          />
        </filter>

        <filter
          x="0"
          y="0"
          width="100"
          height="100"
          filterUnits="objectBoundingBox"
          primitiveUnits="objectBoundingBox"
          id="displacement-map-filter"
        >
          {displacementMapUrl && (
            <feImage
              href={displacementMapUrl}
              x="0"
              y="0"
              width="1"
              height="1"
              preserveAspectRatio="none"
              result="map"
            />
          )}
          <feDisplacementMap
            x="0"
            y="0"
            width="1"
            height="1"
            in="SourceGraphic"
            in2="map"
            scale={0.2}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
};
