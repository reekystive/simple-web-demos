import { en, Faker } from '@faker-js/faker';
import { cn, cva, VariantProps } from '@monorepo/utils';
import { useIntervalEffect, useRafState } from '@react-hookz/web';
import { useAnimationFrame } from 'motion/react';
import {
  ButtonHTMLAttributes,
  FC,
  forwardRef,
  ReactNode,
  UIEvent,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import useStateRef from 'react-usestateref';
import { AnimationIndicator } from './components/indicator.js';
import { useAnchorInView } from './hooks/use-anchor-in-view.js';
import { useSlidingFrequency } from './hooks/use-slide-frequency.js';

const buttonVariants = cva(
  'cursor-pointer rounded-sm border transition-all duration-150 ease-out hover:opacity-90 active:opacity-70 dark:border-blue-500/20 dark:bg-blue-500/20',
  {
    variants: {
      size: {
        md: 'px-2 py-0.5 text-sm',
        sm: 'px-1.5 py-0.5 text-xs',
      },
      color: {
        blue: 'border-blue-600/40 bg-blue-600/80 text-white dark:border-blue-500/20 dark:bg-blue-500/20 dark:text-white',
        red: 'border-red-600/40 bg-red-600/80 text-white dark:border-red-500/20 dark:bg-red-500/20 dark:text-white',
        yellow:
          'border-yellow-600/40 bg-yellow-600/80 text-white dark:border-yellow-500/20 dark:bg-yellow-500/20 dark:text-white',
        green:
          'border-green-600/40 bg-green-600/80 text-white dark:border-green-500/20 dark:bg-green-500/20 dark:text-white',
      },
    },
    defaultVariants: {
      size: 'md',
      color: 'blue',
    },
  }
);

export const Button: FC<ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>> = ({
  children,
  className,
  size,
  color,
  ...props
}) => {
  return (
    <button className={buttonVariants({ className, size, color })} {...props}>
      {children}
    </button>
  );
};

const useFaker = () => {
  const seed = useMemo(() => Math.floor(Math.random() * 1000000), []);
  const fakerWithSeed = useMemo(() => new Faker({ locale: [en], seed }), [seed]);
  const faker = useMemo(() => new Faker({ locale: [en] }), []);
  return {
    faker,
    fakerWithSeed,
    reset: () => {
      fakerWithSeed.seed(seed);
    },
  };
};

interface Content {
  id: string;
  name: string;
  avatar: string;
  introduction: string;
}

export const ScrollAnchoring: FC = () => {
  const { faker, fakerWithSeed, reset: resetFaker } = useFaker();
  const [count, setCount] = useState(0);
  const scrollContainerRef = useRef<ScrollContainerControls>(null);

  const [rollingToTop, setRollingToTop] = useState(false);
  const [rollingToBottom, setRollingToBottom] = useState(false);
  const [snapTo, setSnapTo] = useState<{ start?: boolean; end?: boolean }>({ start: false, end: false });
  const [slowDown, setSlowDown, slowDownRef] = useStateRef(false);

  const [content, setContent] = useState(() => {
    return Array.from({ length: 50 }).map(() => ({
      id: fakerWithSeed.string.uuid(),
      name: fakerWithSeed.person.fullName(),
      avatar: fakerWithSeed.image.avatar(),
      introduction: fakerWithSeed.lorem.paragraph({ min: 1, max: 2 }),
    }));
  });

  useAnimationFrame(() => {
    if (!slowDownRef.current) {
      return;
    }
    // execute a 10 frames (at 60fps) blocking code
    const start = performance.now();
    console.warn('[ScrollAnchoring] executing blocking code for performance testing purposes');
    while (performance.now() - start < (1 / 60) * 10 * 1000) {
      // do nothing
    }
  });

  useIntervalEffect(
    () => {
      const newContent: Content = {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        avatar: faker.image.avatar(),
        introduction: faker.lorem.paragraph({ min: 1, max: 2 }),
      };
      setContent((prev) => [newContent, ...prev]);
    },
    rollingToTop ? 500 : undefined
  );

  useIntervalEffect(
    () => {
      const newContent: Content = {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        avatar: faker.image.avatar(),
        introduction: faker.lorem.paragraph({ min: 1, max: 2 }),
      };
      setContent((prev) => [...prev, newContent]);
    },
    rollingToBottom ? 500 : undefined
  );

  return (
    <div className="mx-auto flex h-dvh max-w-xl flex-col items-center justify-center gap-2 p-2">
      <div className="flex flex-row flex-wrap justify-center gap-2">
        <Button
          size="sm"
          color="blue"
          onClick={() => {
            resetFaker();
            setCount((c) => (c + 1) % 10);
          }}
        >
          Remount
        </Button>
        <Button size="sm" color="blue" onClick={() => setContent([])}>
          Clear
        </Button>
        <Button size="sm" color={rollingToTop ? 'red' : 'blue'} onClick={() => setRollingToTop((v) => !v)}>
          Roll top
        </Button>
        <Button size="sm" color={rollingToBottom ? 'red' : 'blue'} onClick={() => setRollingToBottom((v) => !v)}>
          Roll bottom
        </Button>
        <Button
          size="sm"
          color={snapTo.start ? 'red' : 'blue'}
          onClick={() => {
            setSnapTo((prev) => ({ ...prev, start: !prev.start }));
          }}
        >
          Snap to top
        </Button>
        <Button
          size="sm"
          color={snapTo.end ? 'red' : 'blue'}
          onClick={() => {
            setSnapTo((prev) => ({ ...prev, end: !prev.end }));
          }}
        >
          Snap to bottom
        </Button>
        <Button
          size="sm"
          color="blue"
          onClick={() => {
            scrollContainerRef.current?.scrollToStart();
          }}
        >
          Scroll to top
        </Button>
        <Button
          size="sm"
          color="blue"
          onClick={() => {
            scrollContainerRef.current?.scrollToEnd();
          }}
        >
          Scroll to bottom
        </Button>
        <Button
          size="sm"
          color={slowDown ? 'red' : 'blue'}
          onClick={() => {
            setSlowDown((v) => !v);
          }}
        >
          Slow down
        </Button>
      </div>
      <AnimationIndicator className="fixed bottom-0 left-0" />
      <>
        <style>{`
          [data-scroll-anchor-active] {
            background-color: red;
          }
        `}</style>
        <ScrollContainer
          key={count}
          ref={scrollContainerRef}
          className="flex h-[30rem] w-[20rem] resize flex-col gap-2 overflow-y-auto overflow-x-clip rounded-sm bg-neutral-500/10 py-3 text-sm ring-1 ring-neutral-500/50"
        >
          {content.map((item) => (
            <Item key={item.id}>
              <Profile name={item.name} avatar={item.avatar} introduction={item.introduction} />
            </Item>
          ))}
        </ScrollContainer>
      </>
    </div>
  );
};

interface ScrollContainerControls {
  scrollToTop: () => void;
  scrollToBottom: () => void;
  scrollToStart: () => void;
  scrollToEnd: () => void;
}

interface ScrollContainerProps {
  children?: ReactNode;
  className?: string;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
  snapTo?: 'start' | 'end' | { start?: boolean; end?: boolean };
}

export const ScrollContainer = forwardRef<ScrollContainerControls, ScrollContainerProps>(
  function ScrollContainer(props, ref) {
    const { children, className } = props;
    const containerRef = useRef<HTMLDivElement>(null);
    const id = useId();

    const [potentialAnchorsCount, setPotentialAnchorsCount] = useRafState(0);
    const [anchorsInViewCount, setAnchorsInViewCount] = useRafState(0);
    const [activeAnchorString, setActiveAnchorString] = useRafState('');

    const { track: trackPotentialAnchors } = useSlidingFrequency(1000, 200, (freq) => {
      console.log('[ScrollContainer] potential anchors frequency', freq);
    });
    const { track: trackAnchorsInView } = useSlidingFrequency(1000, 200, (freq) => {
      console.log('[ScrollContainer] anchors in view frequency', freq);
    });
    const { track: trackActiveAnchor } = useSlidingFrequency(1000, 200, (freq) => {
      console.log('[ScrollContainer] active anchor frequency', freq);
    });

    useImperativeHandle(ref, () => {
      const container = containerRef.current;
      if (!container) {
        throw new Error('Scroll container not found');
      }
      return {
        scrollToTop: () => {
          containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        },
        scrollToBottom: () => {
          containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
        },
        scrollToStart: () => {
          containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        },
        scrollToEnd: () => {
          containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
        },
      };
    });

    useAnchorInView({
      containerId: id,
      onPotentialAnchorsChange: (anchors) => {
        console.log('[ScrollContainer] potential anchors', anchors);
        setPotentialAnchorsCount(anchors.length);
        trackPotentialAnchors();
      },
      onAnchorsInViewChange: (anchors) => {
        console.log('[ScrollContainer] anchors in view', anchors);
        setAnchorsInViewCount(anchors.length);
        trackAnchorsInView();
      },
      onActiveAnchorChange: (anchor, previousAnchor) => {
        console.log('[ScrollContainer] active anchor', anchor, previousAnchor);
        previousAnchor?.removeAttribute('data-scroll-anchor-active');
        anchor.setAttribute('data-scroll-anchor-active', '');
        setActiveAnchorString(anchor.textContent ?? '');
        trackActiveAnchor();
      },
    });

    return (
      <>
        <div className="flex flex-row gap-2">
          <div>Potential anchors: {potentialAnchorsCount}</div>
          <div>Anchors in view: {anchorsInViewCount}</div>
          <div>Active anchor: {activeAnchorString}</div>
        </div>
        <div data-scroll-container-id={id} ref={containerRef} className={cn('[overflow-anchor:none]', className)}>
          {children}
        </div>
      </>
    );
  }
);

export const Profile: FC<{ name?: string; avatar?: string; introduction?: string; className?: string }> = ({
  name,
  avatar,
  introduction,
  className,
}) => {
  return (
    <div className={cn('flex flex-row items-center gap-3 px-3 py-2', className)}>
      <div className="h-8 w-8 shrink-0 rounded-full bg-neutral-500/50">
        <img src={avatar} alt={name} className="h-full w-full rounded-full" />
      </div>
      <div className="flex flex-col">
        <div data-scroll-anchor className="self-start text-sm font-medium">
          {name}
        </div>
        <div className="self-stretch text-xs text-neutral-500">{introduction}</div>
      </div>
    </div>
  );
};

export const Item: FC<{ children?: ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <div
      className={cn('border-b-[0.5px] border-t-[0.5px] border-neutral-500/50 bg-white/50 dark:bg-black/50', className)}
    >
      {children}
    </div>
  );
};
