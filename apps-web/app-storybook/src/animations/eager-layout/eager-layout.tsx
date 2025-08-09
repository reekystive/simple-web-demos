import { adventurerNeutral } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import { en, Faker } from '@faker-js/faker';
import { cn } from '@monorepo/utils';
import { X } from 'lucide-react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { nanoid } from 'nanoid';
import { FC, forwardRef, useMemo, useState } from 'react';
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

export const EagerLayout: FC<{ className?: string }> = ({ className }) => {
  const { images, setImages } = useImages();
  return (
    <Layout className={cn('isolate', className)}>
      <AnimatePresence mode="popLayout">
        {images.map((image) => (
          <LayeredLandscape
            key={image.id}
            id={image.id}
            imageUrl={image.imageUrl}
            onClickClose={() => {
              setImages((prev) => prev.filter((prevImage) => prevImage.id !== image.id));
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
    <Layout className={cn(className)}>
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

export const EagerLayoutWithoutEager: FC<{ className?: string }> = ({ className }) => {
  const { images, setImages } = useImages();
  return (
    <Layout className={cn('isolate touch-manipulation', className)}>
      {images.map((image) => (
        <motion.div
          key={image.id}
          transition={{ type: 'spring', visualDuration: 0.4, bounce: 0 }}
          layoutId={`without-eager-${image.id}`}
          style={{ zIndex: -image.seq }}
        >
          <Landscape
            imageUrl={image.imageUrl}
            onClickClose={() => {
              setImages((prev) => prev.filter((prevImage) => prevImage.id !== image.id));
            }}
          />
        </motion.div>
      ))}
    </Layout>
  );
};

export const EagerLayoutSideBySide: FC = () => {
  return (
    <div
      className={`
        mx-auto flex w-screen max-w-7xl flex-row items-start gap-2 px-2
        md:px-6
      `}
    >
      <EagerLayout
        className={`
          min-w-0 shrink grow basis-1 grid-cols-[repeat(auto-fill,minmax(100px,1fr))] px-0
          md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:px-0
        `}
      />
      <div
        className={`
          mx-0 w-px self-stretch bg-neutral-500/30
          md:mx-2
        `}
      />
      <EagerLayoutWithoutEager
        className={`
          min-w-0 shrink grow basis-1 grid-cols-[repeat(auto-fill,minmax(100px,1fr))] px-0
          md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:px-0
        `}
      />
    </div>
  );
};

const LayeredLandscape = forwardRef<
  HTMLDivElement,
  {
    id: string;
    imageUrl: string;
    className?: string;
    style?: React.CSSProperties;
    onClickClose?: React.MouseEventHandler<HTMLButtonElement>;
  }
>(function LandscapeWithAnimation(props, ref) {
  const isPresent = useIsPresent();
  return (
    <motion.div
      style={props.style}
      className={cn('relative h-fit w-full', !isPresent && 'pointer-events-none', props.className)}
      ref={ref}
      transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
      exit={{ opacity: 0 }}
    >
      <Landscape {...props} className="opacity-0" layoutOnly />
      <motion.div
        layoutId={`layered-${props.id}`}
        transition={{ type: 'spring', visualDuration: 0.4, bounce: 0 }}
        className="pointer-events-none absolute inset-0"
      >
        <Landscape {...props} />
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
