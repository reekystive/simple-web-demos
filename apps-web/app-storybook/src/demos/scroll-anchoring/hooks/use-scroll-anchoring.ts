import { useAnimationFrame } from 'motion/react';
import { RefObject, useCallback, useRef } from 'react';

const getTopPositionInContainer = (element: Element, container: Element, containerId: string): number => {
  return (
    element.getBoundingClientRect().top -
    container.getBoundingClientRect().top +
    getPreciseScrollTop(container, containerId)
  );
};

const getPreciseScrollTop = (container: Element, containerId: string): number => {
  const containerAnchor = document.querySelector(
    `[data-scroll-container-anchor-id="${containerId}"]:where([data-scroll-container-id="${containerId}"] *)`
  );
  if (!containerAnchor) {
    console.warn('[ScrollAnchoring] container anchor not found, using scrollTop as fallback.');
    return container.scrollTop;
  }
  const preciseScrollTop = -(containerAnchor.getBoundingClientRect().top - container.getBoundingClientRect().top);
  return preciseScrollTop;
};

export const useScrollAnchoring = ({
  containerRef,
  containerId,
  defaultEnableAnchoring = true,
}: {
  containerRef: RefObject<HTMLElement | null>;
  containerId: string;
  defaultEnableAnchoring: boolean;
}) => {
  const rafPreviousAnchor = useRef<{ anchor: Element; topPositionInContainer: number } | null>(null);
  const activeAnchorRef = useRef<Element | null>(null);
  const isAnchoringEnabledRef = useRef(defaultEnableAnchoring);

  const updateActiveAnchor = useCallback((anchor: Element | null) => {
    activeAnchorRef.current = anchor;
  }, []);

  const enableAnchoring = useCallback(() => {
    isAnchoringEnabledRef.current = true;
  }, []);

  const disableAnchoring = useCallback(() => {
    isAnchoringEnabledRef.current = false;
  }, []);

  const getIsAnchoringEnabled = useCallback(() => {
    return isAnchoringEnabledRef.current;
  }, []);

  useAnimationFrame(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const active = activeAnchorRef.current;
    if (!rafPreviousAnchor.current?.anchor) {
      if (!active) {
        return;
      }
      rafPreviousAnchor.current = {
        anchor: active,
        topPositionInContainer: getTopPositionInContainer(active, container, containerId),
      };
      return;
    }
    if (!active) {
      // previous.anchor is always truthy in this condition
      if (!container.contains(activeAnchorRef.current)) {
        // has been removed from document or moved to outside of the container
        activeAnchorRef.current = null;
        return;
      }
      const currentTopPosition = getTopPositionInContainer(rafPreviousAnchor.current.anchor, container, containerId);
      const diff = currentTopPosition - rafPreviousAnchor.current.topPositionInContainer;
      if (Math.abs(diff) > 0.001 && isAnchoringEnabledRef.current) {
        const expected = getPreciseScrollTop(container, containerId) + diff;
        console.warn('[ScrollAnchoring] triggering active scroll, diff: %f', diff);
        container.scrollBy({ behavior: 'instant', left: 0, top: diff });
        const actual = getPreciseScrollTop(container, containerId);
        if (Math.abs(actual - expected) > 0.001) {
          console.warn(
            '[ScrollAnchoring] expected scrollTop is %f, got %f. diff: %f',
            expected,
            actual,
            actual - expected
          );
        }
      }
      activeAnchorRef.current = null;
      return;
    }
    if (rafPreviousAnchor.current.anchor !== active) {
      const currentTopPosition = getTopPositionInContainer(rafPreviousAnchor.current.anchor, container, containerId);
      const diff = currentTopPosition - rafPreviousAnchor.current.topPositionInContainer;
      if (Math.abs(diff) > 0.001 && getIsAnchoringEnabled()) {
        const expected = getPreciseScrollTop(container, containerId) + diff;
        console.warn('[ScrollAnchoring] triggering active scroll, diff: %f', diff);
        container.scrollBy({ behavior: 'instant', left: 0, top: diff });
        const actual = getPreciseScrollTop(container, containerId);
        if (Math.abs(actual - expected) > 0.001) {
          console.warn(
            '[ScrollAnchoring] expected scrollTop is %f, got %f. diff: %f',
            expected,
            actual,
            actual - expected
          );
        }
      }
      rafPreviousAnchor.current = {
        anchor: active,
        topPositionInContainer: getTopPositionInContainer(active, container, containerId),
      };
      return;
    }
    // the anchor is not changed since last frame and both current and previous is not null
    const currentTopPosition = getTopPositionInContainer(rafPreviousAnchor.current.anchor, container, containerId);
    const diff = currentTopPosition - rafPreviousAnchor.current.topPositionInContainer;
    if (Math.abs(diff) > 0.001 && isAnchoringEnabledRef.current) {
      const expected = getPreciseScrollTop(container, containerId) + diff;
      console.warn('[ScrollAnchoring] triggering active scroll, diff: %f', diff);
      container.scrollBy({ behavior: 'instant', left: 0, top: diff });
      const actual = getPreciseScrollTop(container, containerId);
      if (Math.abs(actual - expected) > 0.001) {
        console.warn(
          '[ScrollAnchoring] expected scrollTop is %f, got %f. diff: %f',
          expected,
          actual,
          actual - expected
        );
      }
    }
    rafPreviousAnchor.current = {
      anchor: active,
      topPositionInContainer: getTopPositionInContainer(active, container, containerId),
    };
  });

  return { updateActiveAnchor, enableAnchoring, disableAnchoring, getIsAnchoringEnabled };
};
