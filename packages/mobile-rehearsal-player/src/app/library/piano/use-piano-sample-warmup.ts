import { useEffect } from 'react';

import { warmPianoSamples } from './piano-sample-sources';
import { startPianoWarmup } from './warm-piano-samples';

// The app's TypeScript config carries no DOM library, so the slice of the
// browser used here is described structurally.
type WarmupScope = {
  cancelIdleCallback?: (handle: number) => void;
  navigator?: { connection?: { effectiveType?: string; saveData?: boolean } };
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
};

/** Connections slower than this are left alone: 21 files would crowd the app. */
const SLOW_CONNECTIONS = new Set(['slow-2g', '2g']);
/** Where there is no idle callback (Safari has none), after the app has settled. */
const FALLBACK_DELAY_MS = 2000;
/** Idle may never come on a busy page; start by then. */
const IDLE_TIMEOUT_MS = 4000;

/**
 * Starts fetching the piano recordings soon after the app opens, so the piano
 * is ready the first time it is used (see `startPianoWarmup`). Web only in
 * effect: native has nothing to fetch.
 */
export const usePianoSampleWarmup = () => {
  useEffect(() => {
    const scope = globalThis as unknown as WarmupScope;
    const connection = scope.navigator?.connection;

    return startPianoWarmup({
      canSpendData: () =>
        connection?.saveData !== true &&
        !SLOW_CONNECTIONS.has(connection?.effectiveType ?? ''),
      warm: warmPianoSamples,
      whenIdle: (callback) => {
        if (scope.requestIdleCallback) {
          const handle = scope.requestIdleCallback(callback, {
            timeout: IDLE_TIMEOUT_MS,
          });

          return () => scope.cancelIdleCallback?.(handle);
        }

        const timer = setTimeout(callback, FALLBACK_DELAY_MS);

        return () => clearTimeout(timer);
      },
    });
  }, []);
};
