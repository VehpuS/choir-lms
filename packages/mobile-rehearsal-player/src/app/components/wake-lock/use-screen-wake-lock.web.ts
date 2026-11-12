import { useEffect } from 'react';

import {
  createWakeLockCoordinator,
  type WakeLockSentinelLike,
} from './wake-lock-coordinator';

type BrowserScope = {
  addEventListener?: (type: string, listener: () => void) => void;
  document?: {
    addEventListener: (type: string, listener: () => void) => void;
    visibilityState: string;
  };
  navigator?: {
    wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
  };
};

let sharedCoordinator: ReturnType<typeof createWakeLockCoordinator> | null =
  null;

const getSharedCoordinator = () => {
  // This project's TypeScript config has no DOM lib, as in the other `.web`
  // files, so the browser is read off `globalThis`.
  const scope = globalThis as unknown as BrowserScope;

  sharedCoordinator ??= createWakeLockCoordinator({
    isVisible: () => scope.document?.visibilityState !== 'hidden',
    onBecameVisible: (listener) => {
      scope.document?.addEventListener('visibilitychange', () => {
        if (scope.document?.visibilityState === 'visible') {
          listener();
        }
      });
    },
    request: scope.navigator?.wakeLock
      ? () =>
          scope.navigator?.wakeLock?.request(
            'screen',
          ) as Promise<WakeLockSentinelLike>
      : undefined,
  });

  return sharedCoordinator;
};

/**
 * Keeps the screen awake while `isActive`, on browsers that support it: for a
 * rehearsal the screen going dark under a score, lyrics or a playing track is
 * the common annoyance. Several callers can be active at once.
 */
export const useScreenWakeLock = (isActive: boolean) => {
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    return getSharedCoordinator().hold();
  }, [isActive]);
};
