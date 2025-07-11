import { en, Faker } from '@faker-js/faker';
import { cn, cva, VariantProps } from '@monorepo/utils';
import { useIntervalEffect } from '@react-hookz/web';
import { motion, useAnimationFrame } from 'motion/react';
import {
  ButtonHTMLAttributes,
  FC,
  forwardRef,
  ReactNode,
  UIEvent,
  useCallback,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useStateRef from 'react-usestateref';

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
    <div className="mx-auto flex h-dvh max-w-xl flex-col items-center justify-center gap-2">
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
          Snap to start
        </Button>
        <Button
          size="sm"
          color={snapTo.end ? 'red' : 'blue'}
          onClick={() => {
            setSnapTo((prev) => ({ ...prev, end: !prev.end }));
          }}
        >
          Scroll to bottom
        </Button>
        <Button
          size="sm"
          color="blue"
          onClick={() => {
            scrollContainerRef.current?.scrollToStart();
          }}
        >
          Scroll to start
        </Button>
        <Button
          size="sm"
          color="blue"
          onClick={() => {
            scrollContainerRef.current?.scrollToEnd();
          }}
        >
          Scroll to end
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
          className="flex h-[30rem] w-[20rem] flex-col gap-2 overflow-y-auto overflow-x-clip rounded-sm bg-neutral-500/10 py-3 text-sm ring-1 ring-neutral-500/50"
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

function deduplicate<T>(array: T[]) {
  return Array.from(new Set(array));
}

export const ScrollContainer = forwardRef<ScrollContainerControls, ScrollContainerProps>(
  function ScrollContainer(props, ref) {
    const { children, className } = props;
    const containerRef = useRef<HTMLDivElement>(null);
    const id = useId();

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

    const anchorElementsRef = useRef<Element[]>([]);
    const [intersectedElements, setIntersectedElements, intersectedElementsRef] = useStateRef<Element[]>([]);
    const [_activeAnchorElement, setActiveAnchorElement, activeAnchorElementRef] = useStateRef<Element | null>(null);

    const getTopIntersectingElementInView = useCallback((intersectingElements: Element[]): Element | null => {
      let minTop = Infinity;
      let currentSelectedElement: Element | null = null;
      intersectingElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.top < minTop) {
          minTop = rect.top;
          currentSelectedElement = element;
        }
      });
      return currentSelectedElement;
    }, []);

    const handleIntersectedElementsChange = useCallback(
      (intersectingElements: Element[]) => {
        setIntersectedElements(intersectingElements);
        const firstIntersectingElement = getTopIntersectingElementInView(intersectingElements);
        if (!firstIntersectingElement) {
          return;
        }
        const previousAnchorElement = activeAnchorElementRef.current;
        if (previousAnchorElement) {
          previousAnchorElement.removeAttribute('data-scroll-anchor-active');
        }
        firstIntersectingElement.setAttribute('data-scroll-anchor-active', '');
        setActiveAnchorElement(firstIntersectingElement);
        console.log('active anchor element', firstIntersectingElement);
      },
      [activeAnchorElementRef, getTopIntersectingElementInView, setActiveAnchorElement, setIntersectedElements]
    );

    const getAnchorElements = useCallback(() => {
      const container = containerRef.current;
      if (!container) {
        return [];
      }
      const subtreeContainerIds = deduplicate(
        Array.from(container.querySelectorAll(`[data-scroll-container-id]:where([data-scroll-container-id="${id}"] *)`))
          .map((element) => element.getAttribute('data-scroll-container-id'))
          .filter((id): id is Exclude<typeof id, null> => id !== null)
          .filter((id) => !!id)
      );
      const anchorElements = Array.from(
        container.querySelectorAll(
          `[data-scroll-anchor]:where([data-scroll-container-id="${id}"] *)` +
            subtreeContainerIds.map((id) => `:not(:where([data-scroll-container-id="${id}"] *))`).join('')
        )
      );
      return anchorElements;
    }, [id]);

    const observeAnchorElementsIntersection = useCallback(
      (elements: Element[], root: Element, onIntersectionChange: (intersectingElements: Element[]) => void) => {
        let intersectingElements: Element[] = [];
        const intersectionObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                intersectingElements.push(entry.target);
              } else {
                intersectingElements = intersectingElements.filter((element) => element !== entry.target);
              }
            });
            onIntersectionChange(intersectingElements);
          },
          { root, threshold: [0], rootMargin: '0px' }
        );
        elements.forEach((element) => {
          intersectionObserver.observe(element);
        });
        return () => {
          intersectionObserver.disconnect();
          intersectingElements = [];
        };
      },
      []
    );

    const intersectionObserverDisconnectRef = useRef<() => void>(() => undefined);

    useLayoutEffect(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }
      const anchorElements = getAnchorElements();
      anchorElementsRef.current = anchorElements;
      const disconnect = observeAnchorElementsIntersection(anchorElements, container, (intersectingElements) => {
        handleIntersectedElementsChange(intersectingElements);
        console.log('[LayoutEffect IntersectionObserver] %o', intersectedElementsRef.current);
      });
      intersectionObserverDisconnectRef.current = disconnect;
      console.log('[LayoutEffect] %o', anchorElements);
    }, [getAnchorElements, handleIntersectedElementsChange, intersectedElementsRef, observeAnchorElementsIntersection]);

    useLayoutEffect(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const mutationObserver = new MutationObserver(() => {
        console.log('[MutationObserver] triggered');

        const anchorElements = getAnchorElements();

        anchorElementsRef.current = anchorElements;
        console.log('[MutationObserver] %o', anchorElements);

        intersectionObserverDisconnectRef.current();
        intersectionObserverDisconnectRef.current = observeAnchorElementsIntersection(
          anchorElements,
          container,
          (intersectingElements) => {
            handleIntersectedElementsChange(intersectingElements);
            console.log('[MutationObserver IntersectionObserver] %o', intersectedElements);
          }
        );
      });

      mutationObserver.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: false,
        attributeFilter: ['data-scroll-anchor'],
        characterData: false,
        characterDataOldValue: false,
      });

      return () => {
        mutationObserver.disconnect();
      };
    }, [
      getAnchorElements,
      handleIntersectedElementsChange,
      id,
      intersectedElements,
      observeAnchorElementsIntersection,
    ]);

    return (
      <div data-scroll-container-id={id} ref={containerRef} className={cn('[overflow-anchor:none]', className)}>
        {children}
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
        <div data-scroll-anchor className="text-sm font-medium">
          {name}
        </div>
        <div className="text-xs text-neutral-500">{introduction}</div>
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

export const AnimationIndicator: FC<{ className?: string }> = ({ className }) => {
  const framesRef = useRef<{ relativeTime: number }[]>([]);
  const [fps, setFps] = useState(0);
  const [showAnimation, setShowAnimation] = useState(false);

  useAnimationFrame(() => {
    framesRef.current = framesRef.current.filter((frame) => frame.relativeTime > performance.now() - 1000);
    framesRef.current.push({ relativeTime: performance.now() });
  });

  useIntervalEffect(() => {
    setFps(framesRef.current.length);
  }, 100);

  return (
    <div
      className={cn(
        'flex h-fit w-fit flex-row items-stretch gap-3 bg-red-500/50 p-2 font-mono text-xs text-black dark:text-white',
        className
      )}
      onClick={() => setShowAnimation((v) => !v)}
    >
      {showAnimation && (
        <div className="relative w-[5rem]">
          <motion.div
            animate={{ left: ['0', '4rem', '0'] }}
            transition={{ duration: 1, repeat: Infinity, repeatType: 'loop' }}
            className="absolute top-0 h-4 w-4 rounded-full bg-black dark:bg-white"
          />
        </div>
      )}
      <div>{fps} FPS</div>
    </div>
  );
};
