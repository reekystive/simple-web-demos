import { en, Faker } from '@faker-js/faker';
import { cn } from '@monorepo/utils';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { FC, forwardRef, useMemo, useState } from 'react';

export const EagerLayout: FC = () => {
  const seed = useMemo(() => new Date().getDay(), []);
  const fakerWithSeed = useMemo(() => new Faker({ seed, locale: en }), [seed]);

  const [images, setImages] = useState(() =>
    Array.from({ length: 50 }, () => {
      const id = fakerWithSeed.string.uuid();
      const imageUrl = fakerWithSeed.image.urlPicsumPhotos({ width: 512, height: 512 });
      return { id, imageUrl };
    })
  );

  return (
    <div
      className="mx-auto grid min-h-screen w-screen max-w-4xl grid-cols-2 content-start justify-center gap-2 px-6 py-4"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 200px))',
      }}
    >
      <AnimatePresence mode="popLayout">
        {images.map((image) => (
          <LandscapeWithAnimation
            key={image.id}
            id={image.id}
            imageUrl={image.imageUrl}
            onClickClose={() => {
              setImages((prev) => prev.filter((prevImage) => prevImage.id !== image.id));
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

const LandscapeWithAnimation = forwardRef<
  HTMLDivElement,
  { id: string; imageUrl: string; onClickClose?: React.MouseEventHandler<HTMLButtonElement> }
>(function LandscapeWithAnimation(props, ref) {
  return (
    <motion.div className="relative aspect-square" ref={ref} exit={{ opacity: 0 }}>
      <Landscape {...props} className="opacity-0" imageUrl={undefined} />
      <motion.div layoutId={`image-${props.id}`} className="pointer-events-none absolute inset-0">
        <Landscape {...props} />
      </motion.div>
    </motion.div>
  );
});

const Landscape: FC<{
  className?: string;
  imageUrl?: string;
  onClickClose?: React.MouseEventHandler<HTMLButtonElement>;
}> = ({ className, imageUrl, onClickClose }) => {
  return (
    <div className={cn('relative size-full overflow-clip rounded-md', className)}>
      {imageUrl && (
        <>
          <img
            src={imageUrl}
            alt="A fake image"
            draggable={false}
            className="size-full select-none object-cover object-center"
          />
          <div className="pointer-events-none absolute left-0 right-0 top-0 h-10 bg-gradient-to-b from-black/50 to-black/0" />
        </>
      )}
      <button className="absolute left-2 top-2 size-6" onClick={onClickClose}>
        <X className="size-full" />
        <div className="absolute -inset-2 cursor-pointer" />
      </button>
    </div>
  );
};
