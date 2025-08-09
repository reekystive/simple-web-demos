import { FancyTimer, FancyTimerRef } from '#src/demos/fancy-timer/fancy-timer.js';
import { adventurerNeutral } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import { en, Faker } from '@faker-js/faker';
import { cn } from '@monorepo/utils';
import { X } from 'lucide-react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { nanoid } from 'nanoid';
import { FC, forwardRef, useMemo, useRef, useState } from 'react';
import { ImageWithState } from './image-with-state.js';

const createRandomAvatar = () => {
  const randomSeed = nanoid();
  const avatar = createAvatar(adventurerNeutral, { seed: randomSeed });
  return avatar.toDataUri();
};

const Layout: FC<{ className?: string; children: React.ReactNode }> = ({ children, className }) => {
  return (
    <div
      className={cn(
        `
          mx-auto grid min-h-screen w-screen max-w-4xl grid-cols-[repeat(auto-fill,minmax(150px,1fr))] content-start
          justify-center gap-2 px-2 py-2
          md:grid-cols-[repeat(auto-fill,minmax(150px,200px))] md:px-6 md:py-4
        `,
        className
      )}
    >
      {children}
    </div>
  );
};

const useImages = () => {
  const seed = useMemo(() => new Date().getDay(), []);
  const fakerWithSeed = useMemo(() => new Faker({ seed, locale: en }), [seed]);
  const [images, setImages] = useState(() =>
    Array.from({ length: 20 }, (_, index) => {
      const id = fakerWithSeed.string.uuid();
      const seq = index;
      const imageUrl = createRandomAvatar();
      return { id, seq, imageUrl };
    })
  );
  return { images, setImages };
};

export const EagerLayout: FC<{ className?: string; onFirstClose?: () => void; onLastClose?: () => void }> = ({
  className,
  onFirstClose,
  onLastClose,
}) => {
  const { images, setImages } = useImages();
  const clickedRef = useRef(false);

  return (
    <Layout className={cn('isolate touch-manipulation', className)}>
      <AnimatePresence mode="popLayout">
        {images.map((image) => (
          <LayeredLandscape
            key={image.id}
            id={image.id}
            imageUrl={image.imageUrl}
            onClickClose={() => {
              if (!clickedRef.current) {
                clickedRef.current = true;
                onFirstClose?.();
              }
              setImages((prev) => {
                const filtered = prev.filter((prevImage) => prevImage.id !== image.id);
                if (filtered.length === 0) {
                  onLastClose?.();
                }
                return filtered;
              });
            }}
            style={{ zIndex: -image.seq }}
          />
        ))}
      </AnimatePresence>
    </Layout>
  );
};

export const EagerLayoutWithoutEager: FC<{
  className?: string;
  onFirstClose?: () => void;
  onLastClose?: () => void;
}> = ({ className, onFirstClose, onLastClose }) => {
  const { images, setImages } = useImages();
  const clickedRef = useRef(false);

  return (
    <Layout className={cn('isolate touch-manipulation', className)}>
      <AnimatePresence mode="popLayout">
        {images.map((image) => (
          <UnLayeredLandscape
            key={image.id}
            id={image.id}
            imageUrl={image.imageUrl}
            onClickClose={() => {
              if (!clickedRef.current) {
                clickedRef.current = true;
                onFirstClose?.();
              }
              setImages((prev) => {
                const filtered = prev.filter((prevImage) => prevImage.id !== image.id);
                if (filtered.length === 0) {
                  onLastClose?.();
                }
                return filtered;
              });
            }}
            style={{ zIndex: -image.seq }}
          />
        ))}
      </AnimatePresence>
    </Layout>
  );
};

export const EagerLayoutWithoutAnimation: FC<{ className?: string }> = ({ className }) => {
  const { images, setImages } = useImages();
  return (
    <Layout className={cn('isolate touch-manipulation', className)}>
      {images.map((image) => (
        <Landscape
          key={image.id}
          imageUrl={image.imageUrl}
          onClickClose={() => {
            setImages((prev) => prev.filter((prevImage) => prevImage.id !== image.id));
          }}
        />
      ))}
    </Layout>
  );
};

export const EagerLayoutSideBySide: FC = () => {
  const withEagerTimerRef = useRef<FancyTimerRef>(null);
  const withoutEagerTimerRef = useRef<FancyTimerRef>(null);

  return (
    <div
      className={cn(`
        mx-auto flex w-screen max-w-7xl flex-row items-start gap-2 px-2 py-4
        md:px-6 md:py-8
      `)}
    >
      <div className="min-w-0 shrink grow basis-1">
        <div className="flex flex-col items-center gap-2 pb-4">
          <div className="text-sm">Remove all tiles as fast as possible</div>
          <FancyTimer className="font-mono text-xl" ref={withEagerTimerRef} />
        </div>
        <EagerLayout
          className={cn(`
            w-full grid-cols-[repeat(auto-fill,minmax(100px,1fr))] px-0 py-0
            md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:px-0 md:py-0
          `)}
          onFirstClose={() => withEagerTimerRef.current?.start()}
          onLastClose={() => withEagerTimerRef.current?.pause()}
        />
      </div>
      <div
        className={cn(`
          mx-0 w-px self-stretch bg-neutral-500/30
          md:mx-2
        `)}
      />
      <div className="min-w-0 shrink grow basis-1">
        <div className="flex flex-col items-center gap-2 pb-4">
          <div className="text-sm">Remove all tiles as fast as possible</div>
          <FancyTimer className="font-mono text-xl" ref={withoutEagerTimerRef} />
        </div>
        <EagerLayoutWithoutEager
          className={cn(`
            w-full grid-cols-[repeat(auto-fill,minmax(100px,1fr))] px-0 py-0
            md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:px-0 md:py-0
          `)}
          onFirstClose={() => withoutEagerTimerRef.current?.start()}
          onLastClose={() => withoutEagerTimerRef.current?.pause()}
        />
      </div>
    </div>
  );
};

const UnLayeredLandscape = forwardRef<
  HTMLDivElement,
  {
    id: string;
    imageUrl: string;
    className?: string;
    style?: React.CSSProperties;
    onClickClose?: React.MouseEventHandler<HTMLButtonElement>;
  }
>(function UnLayeredLandscape(props, ref) {
  const { id, imageUrl, className, style, onClickClose } = props;
  const isPresent = useIsPresent();
  return (
    <motion.div
      ref={ref}
      style={style}
      className={cn('h-fit w-full', !isPresent && 'pointer-events-none', className)}
      transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
      exit={{ opacity: 0 }}
    >
      <motion.div layoutId={`un-layered-${id}`} transition={{ type: 'spring', visualDuration: 0.4, bounce: 0 }}>
        <Landscape imageUrl={imageUrl} onClickClose={onClickClose} />
      </motion.div>
    </motion.div>
  );
});

const LayeredLandscape = forwardRef<
  HTMLDivElement,
  {
    id: string;
    imageUrl: string;
    className?: string;
    style?: React.CSSProperties;
    onClickClose?: React.MouseEventHandler<HTMLButtonElement>;
  }
>(function LayeredLandscape(props, ref) {
  const { id, imageUrl, className, style, onClickClose } = props;
  const isPresent = useIsPresent();
  return (
    <motion.div
      ref={ref}
      style={style}
      className={cn('relative h-fit w-full', !isPresent && 'pointer-events-none', className)}
      transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
      exit={{ opacity: 0 }}
    >
      {/* respond to user inputs */}
      <Landscape imageUrl={imageUrl} onClickClose={onClickClose} layoutOnly className="opacity-0" />
      {/* presentation only layer */}
      <motion.div
        layoutId={`layered-${id}`}
        transition={{ type: 'spring', visualDuration: 0.4, bounce: 0 }}
        className="pointer-events-none absolute inset-0"
      >
        <Landscape imageUrl={imageUrl} />
      </motion.div>
    </motion.div>
  );
});

const Landscape: FC<{
  className?: string;
  imageUrl: string;
  layoutOnly?: boolean;
  onClickClose?: React.MouseEventHandler<HTMLButtonElement>;
}> = ({ className, imageUrl, layoutOnly, onClickClose }) => {
  return (
    <div
      data-name="tile-root"
      className={cn(
        'relative aspect-square w-full overflow-clip rounded-md',
        !layoutOnly && 'bg-neutral-500/10',
        className
      )}
    >
      {!layoutOnly && (
        <>
          <ImageWithState
            src={imageUrl}
            alt="A fake image"
            draggable={false}
            className={cn(`
              size-full scale-125 object-cover object-center opacity-0 blur-sm transition-all duration-500 ease-out
              select-none
              [&[data-state='error']]:hidden
              [&[data-state='loaded']]:scale-100 [&[data-state='loaded']]:opacity-100 [&[data-state='loaded']]:blur-none
            `)}
          />
          <div
            className={cn(`
              pointer-events-none absolute inset-0 hidden items-center justify-center text-xs opacity-70
              [&:where([data-name='tile-root']:has(>_img[data-state='error'])_*)]:flex
            `)}
          >
            Failed to load image
          </div>
          {/* image overlay */}
          <div
            className={cn(`
              pointer-events-none absolute top-0 right-0 left-0 hidden h-15 bg-gradient-to-b from-black/30 to-black/0
              [&:where([data-name='tile-root']:has(>_img[data-state='loaded'])_*)]:block
            `)}
          />
        </>
      )}
      <button
        className="absolute top-2 right-2 size-6 touch-manipulation rounded-full bg-neutral-700/20 p-1 backdrop-blur-md"
        onClick={onClickClose}
      >
        <X className="size-full" />
        <div className="absolute -inset-2 cursor-pointer" />
      </button>
    </div>
  );
};
