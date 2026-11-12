import { useEffect, useRef } from 'react';

import { createBackStack, type BackStackEnvironment } from './back-stack';

type BrowserScope = {
  history?: BackStackEnvironment['history'];
  addEventListener?: BackStackEnvironment['target']['addEventListener'];
};

let sharedStack: ReturnType<typeof createBackStack> | null = null;

const getSharedStack = () => {
  // This project's TypeScript config has no DOM lib, as in the other `.web`
  // files, so the browser's `history` and `window` are read off `globalThis`.
  const scope = globalThis as unknown as BrowserScope;

  if (!sharedStack && scope.history && scope.addEventListener) {
    sharedStack = createBackStack({
      history: scope.history,
      target: { addEventListener: scope.addEventListener.bind(scope) },
    });
  }

  return sharedStack;
};

/**
 * While `isActive`, the browser's Back closes this layer (the topmost one
 * first) instead of leaving the app; see `createBackStack`.
 */
export const useBackDismiss = (isActive: boolean, onDismiss: () => void) => {
  // The layer keeps its place across renders that only change the callback.
  const latest = useRef(onDismiss);

  latest.current = onDismiss;

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    return getSharedStack()?.push(() => latest.current());
  }, [isActive]);
};
