import { useAnimationFrame } from 'motion/react';
import { RefObject, useCallback, useRef } from 'react';

const getTopPositionRelativeToContent = (element: Element, container: Element, containerId: string): number => {
  return (
    element.getBoundingClientRect().top -
    container.getBoundingClientRect().top +
    getPreciseScrollTop(container, containerId)
  );
};

const getTopPositionRelativeToVisibleArea = (element: Element, container: Element): number => {
  return element.getBoundingClientRect().top - container.getBoundingClientRect().top;
};

const getPreciseScrollTop = (container: Element, containerId: string): number => {
  const containerAnchor = container.querySelector(
    `[data-scroll-container-anchor-id="${containerId}"]:where([data-scroll-container-id="${containerId}"] *)`
  );
  if (!containerAnchor) {
    console.warn('[ScrollAnchoring] container anchor not found, using scrollTop as fallback.');
    return container.scrollTop;
  }
  const preciseScrollTop = -(containerAnchor.getBoundingClientRect().top - container.getBoundingClientRect().top);
  return preciseScrollTop;
};

const getSubpixelCompensation = (container: Element, containerId: string): number => {
  const subpixelCompensation = container.querySelector<HTMLElement>(
    `[data-scroll-container-subpixel-compensation-id="${containerId}"]:where([data-scroll-container-id="${containerId}"] *)`
  );
  if (!subpixelCompensation) {
    console.warn('[ScrollAnchoring] subpixel compensation not found. using 0px as fallback.');
    return 0;
  }
  return subpixelCompensation.getBoundingClientRect().height;
};

const setSubpixelCompensation = (container: Element, containerId: string, compensation: number) => {
  const subpixelCompensation = container.querySelector<HTMLElement>(
    `[data-scroll-container-subpixel-compensation-id="${containerId}"]:where([data-scroll-container-id="${containerId}"] *)`
  );
  if (!subpixelCompensation) {
    console.warn('[ScrollAnchoring] subpixel compensation not found');
    return;
  }
  if (compensation > 1) {
    console.warn(
      '[ScrollAnchoring] Unexpected subpixel compensation. compensation is %fpx, which is greater than 1px',
      compensation
    );
  }
  if (compensation < 0) {
    console.warn(
      '[ScrollAnchoring] Unexpected subpixel compensation. compensation is %fpx, which is less than 0px. setting to 0px instead.',
      compensation
    );
    compensation = 0;
  }
  subpixelCompensation.style.height = `${compensation}px`;
};

const scrollToAnchor = (container: Element, containerId: string, previousAnchor: Anchor, currentAnchor: Element) => {
  const currentTop = getTopPositionRelativeToContent(previousAnchor.anchor, container, containerId);
  const previousTop = previousAnchor.topPositionRelativeToContent;
  const previousCompensation = getSubpixelCompensation(container, containerId);
  const diffToScroll = currentTop - previousTop + previousCompensation;

  if (Math.abs(diffToScroll) < 0.001) {
    console.info('[ScrollAnchoring] no need to scroll, diffToScroll is %fpx.', diffToScroll);
    return;
  }

  setSubpixelCompensation(container, containerId, 0);
  const expectedScrollTop = getPreciseScrollTop(container, containerId) + diffToScroll;
  const expectedVisibleTop = previousAnchor.topPositionRelativeToVisibleArea;

  console.info('[ScrollAnchoring] executing active scroll, diff to scroll: %fpx', diffToScroll);
  container.scrollBy({ behavior: 'instant', left: 0, top: diffToScroll });

  const actualScrollTop = getPreciseScrollTop(container, containerId);
  const scrollTopDiscrepancy = actualScrollTop - expectedScrollTop;
  const actualVisibleTop = getTopPositionRelativeToVisibleArea(currentAnchor, container);
  const visibleTopDiscrepancy = actualVisibleTop - expectedVisibleTop;

  if (Math.abs(scrollTopDiscrepancy) > 0.001 || Math.abs(visibleTopDiscrepancy) > 0.001) {
    console.warn(
      `[ScrollAnchoring] expected scrollTop is %fpx, got %fpx. discrepancy: %fpx.`,
      expectedScrollTop,
      actualScrollTop,
      scrollTopDiscrepancy
    );

    console.warn(
      `[ScrollAnchoring] expected visibleTop is %fpx, got %fpx. discrepancy: %fpx. adding %fpx subpixel padding to compensate.`,
      expectedVisibleTop,
      actualVisibleTop,
      scrollTopDiscrepancy,
      -scrollTopDiscrepancy
    );

    setSubpixelCompensation(container, containerId, -scrollTopDiscrepancy);
    const visibleTopAfterCompensation = getTopPositionRelativeToVisibleArea(currentAnchor, container);

    console.warn(
      `[ScrollAnchoring] after compensation, visibleTop is %fpx. effectively compensated %fpx`,
      visibleTopAfterCompensation,
      visibleTopAfterCompensation - actualVisibleTop
    );
  }
};

interface Anchor {
  anchor: Element;
  topPositionRelativeToContent: number;
  topPositionRelativeToVisibleArea: number;
}

export const useScrollAnchoring = ({
  containerRef,
  containerId,
  defaultEnableAnchoring = true,
}: {
  containerRef: RefObject<HTMLElement | null>;
  containerId: string;
  defaultEnableAnchoring: boolean;
}) => {
  const previousFrameAnchor = useRef<Anchor | null>(null);
  const activeAnchorRef = useRef<Element | null>(null);
  const isAnchoringEnabledRef = useRef(defaultEnableAnchoring);
  const frameCountRef = useRef(0);

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
    frameCountRef.current++;
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const active = activeAnchorRef.current;
    if (!previousFrameAnchor.current?.anchor) {
      if (!active) {
        // case 1: previous === null && active === null
        return;
      }
      // case 2: previous === null && active !== null
      previousFrameAnchor.current = {
        anchor: active,
        topPositionRelativeToContent: getTopPositionRelativeToContent(active, container, containerId),
        topPositionRelativeToVisibleArea: getTopPositionRelativeToVisibleArea(active, container),
      };
      return;
    }
    if (!active) {
      // case 3: previous !== null && active === null
      // previous.anchor is always truthy in this condition
      if (!container.contains(activeAnchorRef.current)) {
        // has been removed from document or moved to outside of the container
        // so do nothing in current frame, execute anchoring in next frame
        activeAnchorRef.current = null;
        return;
      }
      // previous anchor is still in the container, since the anchor in current frame has changed,
      // we still use the previous anchor in current frame, and this is the last frame we use the previous anchor
      const currentTopPosition = getTopPositionRelativeToContent(
        previousFrameAnchor.current.anchor,
        container,
        containerId
      );
      const diffToScroll = currentTopPosition - previousFrameAnchor.current.topPositionRelativeToContent;
      if (Math.abs(diffToScroll) > 0.001 && getIsAnchoringEnabled()) {
        console.info('[ScrollAnchoring] triggering active scroll, frame count: %d', frameCountRef.current);
        scrollToAnchor(container, containerId, previousFrameAnchor.current, previousFrameAnchor.current.anchor);
      }
      activeAnchorRef.current = null;
      return;
    }
    if (previousFrameAnchor.current.anchor !== active) {
      // case 4: previous !== null && active !== null, but previous.anchor !== active
      const currentTopPosition = getTopPositionRelativeToContent(
        previousFrameAnchor.current.anchor,
        container,
        containerId
      );
      const diffToScroll = currentTopPosition - previousFrameAnchor.current.topPositionRelativeToContent;
      if (Math.abs(diffToScroll) > 0.001 && getIsAnchoringEnabled()) {
        console.info('[ScrollAnchoring] triggering active scroll, frame count: %d', frameCountRef.current);
        scrollToAnchor(container, containerId, previousFrameAnchor.current, previousFrameAnchor.current.anchor);
      }
      previousFrameAnchor.current = {
        anchor: active,
        topPositionRelativeToContent: getTopPositionRelativeToContent(active, container, containerId),
        topPositionRelativeToVisibleArea: getTopPositionRelativeToVisibleArea(active, container),
      };
      return;
    }
    // case 5: previous !== null && active !== null, and previous.anchor === active
    // the anchor is not changed since last frame and both current and previous is not null
    const currentTopPosition = getTopPositionRelativeToContent(
      previousFrameAnchor.current.anchor,
      container,
      containerId
    );
    const diffToScroll = currentTopPosition - previousFrameAnchor.current.topPositionRelativeToContent;
    if (Math.abs(diffToScroll) > 0.001 && getIsAnchoringEnabled()) {
      console.info('[ScrollAnchoring] triggering active scroll, frame count: %d', frameCountRef.current);
      scrollToAnchor(container, containerId, previousFrameAnchor.current, previousFrameAnchor.current.anchor);
    }
    previousFrameAnchor.current = {
      anchor: active,
      topPositionRelativeToContent: getTopPositionRelativeToContent(active, container, containerId),
      topPositionRelativeToVisibleArea: getTopPositionRelativeToVisibleArea(active, container),
    };
  });

  return { updateActiveAnchor, enableAnchoring, disableAnchoring, getIsAnchoringEnabled };
};
