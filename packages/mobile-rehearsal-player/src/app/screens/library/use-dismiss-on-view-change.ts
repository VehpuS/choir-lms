import { useEffect, useRef } from 'react';

/**
 * An acknowledgment belongs to the view that produced it, so switching views
 * clears it (as leaving Files always has). `dismiss` is rebuilt every render,
 * so it is read through a ref and the effect re-runs only when the view changes.
 */
export const useDismissOnViewChange = (dismiss: () => void, view: string) => {
  const dismissRef = useRef(dismiss);

  dismissRef.current = dismiss;
  useEffect(() => {
    dismissRef.current();
  }, [view]);
};
