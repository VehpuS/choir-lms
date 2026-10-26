import { useCallback, useState } from 'react';

/**
 * Asks the page area to take the keyboard back. `focusRequest` changes on each
 * request (the surface focuses when it does, unless a text field has focus),
 * and `after` wraps a toolbar action so it asks once the action has run.
 */
export const usePageAreaFocus = () => {
  const [focusRequest, setFocusRequest] = useState(0);
  const returnFocus = useCallback(
    () => setFocusRequest((count) => count + 1),
    [],
  );
  const after = (action: () => void) => () => {
    action();
    returnFocus();
  };

  return { after, focusRequest, returnFocus };
};
