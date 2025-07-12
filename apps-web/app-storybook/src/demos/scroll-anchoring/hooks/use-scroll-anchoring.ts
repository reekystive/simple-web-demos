import { useAnimationFrame } from 'motion/react';
import { RefObject, useCallback, useRef } from 'react';

const getTopPositionInContainer = (element: Element, container: Element): number => {
  return element.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
};

export const useScrollAnchoring = ({
  containerRef,
  defaultEnableAnchoring = true,
}: {
  containerRef: RefObject<HTMLElement | null>;
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
        topPositionInContainer: getTopPositionInContainer(active, container),
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
      const currentTopPosition = getTopPositionInContainer(rafPreviousAnchor.current.anchor, container);
      const diff = currentTopPosition - rafPreviousAnchor.current.topPositionInContainer;
      if (diff !== 0 && isAnchoringEnabledRef.current) {
        container.scrollBy({ behavior: 'instant', left: 0, top: diff });
      }
      activeAnchorRef.current = null;
      return;
    }
    if (rafPreviousAnchor.current.anchor !== active) {
      const currentTopPosition = getTopPositionInContainer(rafPreviousAnchor.current.anchor, container);
      const diff = currentTopPosition - rafPreviousAnchor.current.topPositionInContainer;
      if (diff !== 0 && getIsAnchoringEnabled()) {
        container.scrollBy({ behavior: 'instant', left: 0, top: diff });
      }
      rafPreviousAnchor.current = {
        anchor: active,
        topPositionInContainer: getTopPositionInContainer(active, container),
      };
      return;
    }
    // the anchor is not changed since last frame and both current and previous is not null
    const currentTopPosition = getTopPositionInContainer(rafPreviousAnchor.current.anchor, container);
    const diff = currentTopPosition - rafPreviousAnchor.current.topPositionInContainer;
    if (diff !== 0 && isAnchoringEnabledRef.current) {
      container.scrollBy({ behavior: 'instant', left: 0, top: diff });
    }
    rafPreviousAnchor.current = {
      anchor: active,
      topPositionInContainer: getTopPositionInContainer(active, container),
    };
  });

  return { updateActiveAnchor, enableAnchoring, disableAnchoring, getIsAnchoringEnabled };
};
