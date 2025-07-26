import { en, Faker } from '@faker-js/faker';
import { cn } from '@monorepo/utils';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { FC, forwardRef, useMemo, useState } from 'react';

const Layout: FC<{ className?: string; children: React.ReactNode }> = ({ children, className }) => {
  return (
    <div
      className={cn(
        'mx-auto grid min-h-screen w-screen max-w-4xl grid-cols-[repeat(auto-fill,minmax(150px,1fr))] content-start justify-center gap-2 px-2 py-2 md:grid-cols-[repeat(auto-fill,minmax(150px,200px))] md:px-6 md:py-4',
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
    Array.from({ length: 50 }, () => {
      const id = fakerWithSeed.string.uuid();
      const imageUrl = fakerWithSeed.image.urlPicsumPhotos({ width: 512, height: 512 });
      return { id, imageUrl };
    })
  );
  return { images, setImages };
};

export const EagerLayout: FC = () => {
  const { images, setImages } = useImages();
  return (
    <Layout>
      <AnimatePresence mode="popLayout">
        {images.map((image) => (
          <LayeredLandscape
            key={image.id}
            id={image.id}
            imageUrl={image.imageUrl}
            onClickClose={() => {
              setImages((prev) => prev.filter((prevImage) => prevImage.id !== image.id));
            }}
          />
        ))}
      </AnimatePresence>
    </Layout>
  );
};

export const EagerLayoutWithoutAnimation: FC = () => {
  const { images, setImages } = useImages();
  return (
    <Layout>
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

export const EagerLayoutWithoutEager = () => {
  const { images, setImages } = useImages();
  return (
    <Layout className="touch-manipulation">
      {images.map((image) => (
        <motion.div key={image.id} layoutId={`without-eager-${image.id}`}>
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

const LayeredLandscape = forwardRef<
  HTMLDivElement,
  { id: string; imageUrl: string; onClickClose?: React.MouseEventHandler<HTMLButtonElement> }
>(function LandscapeWithAnimation(props, ref) {
  return (
    <motion.div className="relative h-fit w-full" ref={ref} exit={{ opacity: 0 }}>
      <Landscape {...props} className="opacity-0" layoutOnly />
      <motion.div layoutId={`layered-${props.id}`} className="pointer-events-none absolute inset-0">
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
    <div className={cn('relative aspect-square w-full overflow-clip rounded-md', className)}>
      {!layoutOnly && (
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
      <button className="absolute left-2 top-2 size-6 touch-manipulation" onClick={onClickClose}>
        <X className="size-full" />
        <div className="absolute -inset-2 cursor-pointer" />
      </button>
    </div>
  );
};
