import { Button } from '#src/components/button/button.js';
import { cn } from '@monorepo/utils';
import { useIntervalEffect } from '@react-hookz/web';
import { motion, useAnimationFrame } from 'motion/react';
import { FC, forwardRef, ReactNode, RefObject, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import useStateRef from 'react-usestateref';
import { AnimationIndicator } from './components/indicator.js';
import { useAnchorInView } from './hooks/use-anchor-in-view.js';
import { useFaker } from './hooks/use-faker.js';
import { useScrollAnchoring } from './hooks/use-scroll-anchoring.js';

type Content =
  | {
      type: 'profile';
      id: string;
      name: string;
      avatar: string;
      introduction: string;
    }
  | {
      type: 'janky';
      id: string;
      variant: 'smooth' | 'random-integer' | 'random-float';
    };

export const ScrollAnchoring: FC = () => {
  const { faker, fakerWithSeed, reset: resetFaker } = useFaker();
  const [count, setCount] = useState(0);
  const scrollContainerRef = useRef<ScrollContainerControls>(null);

  const [rollingToTop, setRollingToTop] = useState(false);
  const [rollingToBottom, setRollingToBottom] = useState(false);
  const [snapTo, setSnapTo] = useState<{ start?: boolean; end?: boolean }>({ start: false, end: false });
  const [slowDown, setSlowDown, slowDownRef] = useStateRef(false);
  const [isJavaScriptAnchoringEnabled, setIsJavaScriptAnchoringEnabled] = useState(true);
  const [isCSSAnchoringEnabled, setIsCSSAnchoringEnabled] = useState(false);
  const [potentialAnchorsCount, setPotentialAnchorsCount] = useState(0);
  const [anchorsInViewCount, setAnchorsInViewCount] = useState(0);
  const [activeAnchorString, setActiveAnchorString] = useState('');
  const [width, setWidth] = useState<'small' | 'large'>('small');
  const supportsCSSAnchoring = useMemo(() => {
    return CSS.supports('overflow-anchor', 'auto');
  }, []);

  const [content, setContent] = useState<Content[]>(() => {
    resetFaker();
    return Array.from({ length: 50 }).map(() => ({
      type: 'profile',
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
    console.warn('[ScrollAnchoring] executing synchronous blocking code for performance testing purposes');
    while (performance.now() - start < (1 / 60) * 10 * 1000) {
      // do nothing
    }
  });

  useIntervalEffect(
    () => {
      const newContent: Content = {
        type: 'profile',
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
        type: 'profile',
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
    <>
      <AnimationIndicator className="fixed bottom-0 left-0" />

      <div className="mx-auto flex h-dvh max-w-xl flex-col items-center justify-center gap-4 p-2">
        <div className="flex flex-col gap-2">
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
            <Button
              size="sm"
              color={slowDown ? 'red' : 'blue'}
              onClick={() => {
                setSlowDown((v) => !v);
              }}
              allPossibleContents={['Stop slowing down', 'Execute slow code']}
            >
              {slowDown ? 'Stop slowing down' : 'Execute slow code'}
            </Button>
            <Button
              size="sm"
              color={isJavaScriptAnchoringEnabled ? 'red' : 'blue'}
              onClick={() => {
                setIsJavaScriptAnchoringEnabled((v) => {
                  const newValue = !v;
                  if (newValue) {
                    scrollContainerRef.current?.enableAnchoring();
                    setIsCSSAnchoringEnabled(false);
                  } else {
                    scrollContainerRef.current?.disableAnchoring();
                  }
                  return newValue;
                });
              }}
              allPossibleContents={['Disable JavaScript anchoring', 'Enable JavaScript anchoring']}
            >
              {isJavaScriptAnchoringEnabled ? 'Disable JavaScript anchoring' : 'Enable JavaScript anchoring'}
            </Button>
            <Button
              size="sm"
              color={isCSSAnchoringEnabled ? 'red' : 'blue'}
              onClick={() => {
                setIsCSSAnchoringEnabled((v) => {
                  const newValue = !v;
                  if (newValue) {
                    setIsJavaScriptAnchoringEnabled(false);
                    scrollContainerRef.current?.disableAnchoring();
                  }
                  return newValue;
                });
              }}
              disabled={!supportsCSSAnchoring}
              allPossibleContents={
                supportsCSSAnchoring
                  ? ['Disable CSS anchoring', 'Enable CSS anchoring']
                  : ['CSS anchoring is not supported in current browser']
              }
            >
              {supportsCSSAnchoring
                ? isCSSAnchoringEnabled
                  ? 'Disable CSS anchoring'
                  : 'Enable CSS anchoring'
                : 'CSS anchoring is not supported in current browser'}
            </Button>
            <Button
              size="sm"
              color="blue"
              onClick={() =>
                setWidth((v) => {
                  // remove inline width from the container set by resize handle
                  const container = scrollContainerRef.current?.containerDomRef.current;
                  if (container) {
                    container.style.width = '';
                  }
                  return v === 'small' ? 'large' : 'small';
                })
              }
            >
              Toggle width
            </Button>
          </div>

          <hr className="h-[0.5px] w-full border-none bg-neutral-500/50" />

          <div className="flex flex-row flex-wrap justify-center gap-2">
            <Button
              size="sm"
              color="blue"
              onClick={() => {
                const newContent: Content = {
                  type: 'profile',
                  id: faker.string.uuid(),
                  name: faker.person.fullName(),
                  avatar: faker.image.avatar(),
                  introduction: faker.lorem.paragraph({ min: 1, max: 2 }),
                };
                setContent((prev) => [newContent, ...prev]);
              }}
            >
              Add one profile to top
            </Button>
            <Button
              size="sm"
              color="blue"
              onClick={() => {
                const newContent: Content = {
                  type: 'janky',
                  id: faker.string.uuid(),
                  variant: 'smooth',
                };
                setContent((prev) => [newContent, ...prev]);
              }}
            >
              Add one janky (smooth) to top
            </Button>
            <Button
              size="sm"
              color="blue"
              onClick={() => {
                const newContent: Content = {
                  type: 'janky',
                  id: faker.string.uuid(),
                  variant: 'random-integer',
                };
                setContent((prev) => [newContent, ...prev]);
              }}
            >
              Add one janky (random, integer) to top
            </Button>
            <Button
              size="sm"
              color="blue"
              onClick={() => {
                const newContent: Content = {
                  type: 'janky',
                  id: faker.string.uuid(),
                  variant: 'random-float',
                };
                setContent((prev) => [newContent, ...prev]);
              }}
            >
              Add one janky (random, float) to top
            </Button>
            <Button size="sm" color="blue" onClick={() => setContent((prev) => prev.slice(1))}>
              Remove one from top
            </Button>
            <Button
              size="sm"
              color={rollingToTop ? 'red' : 'blue'}
              onClick={() => setRollingToTop((v) => !v)}
              allPossibleContents={['Stop rolling to top', 'Start rolling to top']}
            >
              {rollingToTop ? 'Stop rolling to top' : 'Start rolling to top'}
            </Button>
          </div>

          <hr className="h-[0.5px] w-full border-none bg-neutral-500/50" />

          <div className="flex flex-row flex-wrap justify-center gap-2">
            <Button
              size="sm"
              color="blue"
              onClick={() => {
                const newContent: Content = {
                  type: 'profile',
                  id: faker.string.uuid(),
                  name: faker.person.fullName(),
                  avatar: faker.image.avatar(),
                  introduction: faker.lorem.paragraph({ min: 1, max: 2 }),
                };
                setContent((prev) => [...prev, newContent]);
              }}
            >
              Add one profile to bottom
            </Button>
            <Button
              size="sm"
              color="blue"
              onClick={() => {
                const newContent: Content = {
                  type: 'janky',
                  id: faker.string.uuid(),
                  variant: 'smooth',
                };
                setContent((prev) => [...prev, newContent]);
              }}
            >
              Add one janky (smooth) to bottom
            </Button>
            <Button
              size="sm"
              color="blue"
              onClick={() => {
                const newContent: Content = {
                  type: 'janky',
                  id: faker.string.uuid(),
                  variant: 'random-integer',
                };
                setContent((prev) => [...prev, newContent]);
              }}
            >
              Add one janky (random, integer) to bottom
            </Button>
            <Button
              size="sm"
              color="blue"
              onClick={() => {
                const newContent: Content = {
                  type: 'janky',
                  id: faker.string.uuid(),
                  variant: 'random-float',
                };
                setContent((prev) => [...prev, newContent]);
              }}
            >
              Add one janky (random, float) to bottom
            </Button>
            <Button size="sm" color="blue" onClick={() => setContent((prev) => prev.slice(0, -1))}>
              Remove one from bottom
            </Button>
            <Button
              size="sm"
              color={rollingToBottom ? 'red' : 'blue'}
              onClick={() => setRollingToBottom((v) => !v)}
              allPossibleContents={['Stop rolling to bottom', 'Start rolling to bottom']}
            >
              {rollingToBottom ? 'Stop rolling to bottom' : 'Start rolling to bottom'}
            </Button>
          </div>

          <hr className="h-[0.5px] w-full border-none bg-neutral-500/50" />

          <div className="flex flex-row flex-wrap justify-center gap-2">
            <Button
              size="sm"
              color={snapTo.start ? 'red' : 'blue'}
              onClick={() => {
                setSnapTo((prev) => ({ ...prev, start: !prev.start }));
              }}
              allPossibleContents={['Un-snap to top', 'Snap to top']}
            >
              {snapTo.start ? 'Un-snap to top' : 'Snap to top'}
            </Button>
            <Button
              size="sm"
              color={snapTo.end ? 'red' : 'blue'}
              onClick={() => {
                setSnapTo((prev) => ({ ...prev, end: !prev.end }));
              }}
              allPossibleContents={['Un-snap to bottom', 'Snap to bottom']}
            >
              {snapTo.end ? 'Un-snap to bottom' : 'Snap to bottom'}
            </Button>
            <Button
              size="sm"
              color="blue"
              onClick={() => {
                scrollContainerRef.current?.scrollToTop();
              }}
            >
              Scroll to top
            </Button>
            <Button
              size="sm"
              color="blue"
              onClick={() => {
                scrollContainerRef.current?.scrollToBottom();
              }}
            >
              Scroll to bottom
            </Button>
          </div>
        </div>

        <style>{` [data-scroll-anchor-active] { background-color: rgba(255,0,0,0.5); } `}</style>

        <ScrollContainer
          key={count}
          ref={scrollContainerRef}
          className={cn(
            'h-[25rem] w-[20rem] resize overflow-y-auto overflow-x-clip rounded-sm bg-neutral-500/10 ring-1 ring-neutral-500/50',
            width === 'large' && 'w-[30rem]',
            isCSSAnchoringEnabled && '[overflow-anchor:auto]'
          )}
          contentProps={{
            className: 'flex flex-col gap-2 py-3 text-sm',
          }}
          onPotentialAnchorsChange={(anchors) => {
            setPotentialAnchorsCount(anchors.length);
          }}
          onAnchorsInViewChange={(anchors) => {
            setAnchorsInViewCount(anchors.length);
          }}
          onActiveAnchorChange={(anchor) => {
            setActiveAnchorString(anchor?.textContent ?? '');
          }}
          defaultEnableAnchoring={true}
        >
          {content.map((item) =>
            item.type === 'profile' ? (
              <Item key={item.id}>
                <Profile name={item.name} avatar={item.avatar} introduction={item.introduction} />
              </Item>
            ) : (
              <Item key={item.id}>
                {item.variant === 'smooth' ? (
                  <JankySmooth />
                ) : item.variant === 'random-integer' ? (
                  <JankyUnpredictable randomType="integer" />
                ) : (
                  (item.variant satisfies 'random-float', (<JankyUnpredictable randomType="float" />))
                )}
              </Item>
            )
          )}
        </ScrollContainer>

        <div className="pointer-events-none fixed left-0 right-0 top-0 flex flex-col border-b border-neutral-400/50 bg-neutral-200/70 px-3 py-2 font-mono text-xs text-black opacity-70 dark:border-neutral-500/30 dark:bg-neutral-900 dark:text-white">
          <div>Potential anchors: {potentialAnchorsCount}</div>
          <div>Anchors in view: {anchorsInViewCount}</div>
          <div>Active anchor: {activeAnchorString}</div>
        </div>
      </div>
    </>
  );
};

interface ScrollContainerControls {
  containerDomRef: RefObject<HTMLDivElement | null>;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  enableAnchoring: () => void;
  disableAnchoring: () => void;
  getIsAnchoringEnabled: () => boolean;
  getActiveAnchor: () => Element | null;
  getPotentialAnchors: () => Element[];
  getAnchorsInView: () => Element[];
}

interface ScrollContainerProps {
  children?: ReactNode;
  className?: string;
  snapTo?: 'start' | 'end' | { start?: boolean; end?: boolean };
  onPotentialAnchorsChange?: (anchors: Element[]) => void;
  onAnchorsInViewChange?: (anchors: Element[]) => void;
  onActiveAnchorChange?: (anchor: Element | null, previousAnchor: Element | null) => void;
  defaultEnableAnchoring: boolean;
  contentProps?: {
    className?: string;
  };
}

export const ScrollContainer = forwardRef<ScrollContainerControls, ScrollContainerProps>(
  function ScrollContainer(props, ref) {
    const {
      children,
      className,
      onPotentialAnchorsChange,
      onAnchorsInViewChange,
      onActiveAnchorChange,
      defaultEnableAnchoring,
    } = props;
    const containerRef = useRef<HTMLDivElement>(null);
    const id = useId();

    const { updateActiveAnchor, enableAnchoring, disableAnchoring, getIsAnchoringEnabled } = useScrollAnchoring({
      containerRef,
      containerId: id,
      defaultEnableAnchoring,
    });

    useImperativeHandle(ref, () => {
      const container = containerRef.current;
      if (!container) {
        throw new Error('Scroll container not found');
      }
      return {
        containerDomRef: containerRef,
        scrollToTop: () => {
          containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        },
        scrollToBottom: () => {
          containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
        },
        enableAnchoring: () => {
          enableAnchoring();
        },
        disableAnchoring: () => {
          disableAnchoring();
        },
        getIsAnchoringEnabled: () => {
          return getIsAnchoringEnabled();
        },
        getActiveAnchor: () => {
          return activeAnchorRef.current;
        },
        getPotentialAnchors: () => {
          return potentialAnchorsRef.current;
        },
        getAnchorsInView: () => {
          return inViewAnchorsRef.current;
        },
      } satisfies ScrollContainerControls;
    });

    const potentialAnchorsRef = useRef<Element[]>([]);
    const inViewAnchorsRef = useRef<Element[]>([]);
    const activeAnchorRef = useRef<Element | null>(null);

    useAnchorInView({
      containerId: id,
      onPotentialAnchorsChange: (anchors) => {
        potentialAnchorsRef.current = anchors;
        // console.log('[ScrollContainer] potential anchors', anchors);
        onPotentialAnchorsChange?.(anchors);
      },
      onAnchorsInViewChange: (anchors) => {
        inViewAnchorsRef.current = anchors;
        // console.log('[ScrollContainer] anchors in view', anchors);
        onAnchorsInViewChange?.(anchors);
      },
      onActiveAnchorChange: (anchor, previousAnchor) => {
        activeAnchorRef.current = anchor;
        // console.log('[ScrollContainer] active anchor', anchor, previousAnchor);
        previousAnchor?.removeAttribute('data-scroll-anchor-active');
        anchor?.setAttribute('data-scroll-anchor-active', '');
        updateActiveAnchor(anchor);
        onActiveAnchorChange?.(anchor, previousAnchor);
      },
    });

    return (
      <div
        data-scroll-container-id={id}
        ref={containerRef}
        className={cn('relative [overflow-anchor:none]', className)}
      >
        <div data-scroll-container-anchor-id={id} className="invisible absolute left-0 top-0 h-0 w-0 overflow-clip" />
        <div
          data-scroll-container-subpixel-compensation-id={id}
          className="invisible h-0 w-full shrink-0 overflow-clip"
        />
        <div data-scroll-container-content-id={id} className={props.contentProps?.className}>
          {children}
        </div>
      </div>
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
        <div data-scroll-anchor className="self-stretch text-xs text-neutral-500">
          {introduction}
        </div>
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

export const JankySmooth: FC = () => {
  const { fakerWithSeed } = useFaker();
  const title = useMemo(() => fakerWithSeed.person.fullName(), [fakerWithSeed]);
  const lorem = useMemo(() => fakerWithSeed.lorem.paragraph({ min: 8, max: 10 }), [fakerWithSeed]);

  return (
    <motion.div
      className="flex flex-col overflow-clip px-3 py-2"
      initial={{
        height: '4rem',
      }}
      animate={{
        height: '8rem',
      }}
      transition={{
        duration: 0.5,
        ease: 'circInOut',
        repeat: Infinity,
        repeatType: 'reverse',
        delay: -1 * Math.random() * 0.5,
      }}
    >
      <div className="self-start text-sm" data-scroll-anchor>
        {title}
      </div>
      <div className="self-stretch text-xs text-neutral-500" data-scroll-anchor>
        {lorem}
      </div>
    </motion.div>
  );
};

export const JankyUnpredictable: FC<{ randomType: 'integer' | 'float' }> = ({ randomType }) => {
  const { fakerWithSeed } = useFaker();
  const ref = useRef<HTMLDivElement>(null);
  const title = useMemo(() => fakerWithSeed.person.fullName(), [fakerWithSeed]);
  const lorem = useMemo(() => fakerWithSeed.lorem.paragraph({ min: 8, max: 10 }), [fakerWithSeed]);

  useAnimationFrame(() => {
    if (!ref.current) {
      return;
    }
    const minRem = 4;
    const maxRem = 8;
    if (randomType === 'integer') {
      const remInPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const minPx = Math.floor(minRem * remInPx);
      const maxPx = Math.ceil(maxRem * remInPx);
      const height = Math.floor(Math.random() * (maxPx - minPx) + minPx);
      ref.current.style.height = `${height}px`;
    } else {
      randomType satisfies 'float';
      const height = Math.random() * (maxRem - minRem) + minRem;
      ref.current.style.height = `${height}rem`;
    }
  });

  return (
    <div ref={ref} className="flex flex-col overflow-clip px-3 py-2">
      <div className="self-start text-sm" data-scroll-anchor>
        {title}
      </div>
      <div className="self-stretch text-xs text-neutral-500" data-scroll-anchor>
        {lorem}
      </div>
    </div>
  );
};
