import { useEffect } from 'react';

export const useGrabbingCursor = (grabbing: boolean) => {
  useEffect(() => {
    if (grabbing) {
      document.body.style.cursor = 'grabbing';
    } else {
      document.body.style.cursor = '';
    }
  }, [grabbing]);
};
