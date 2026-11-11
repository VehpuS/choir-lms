import { useCallback, useEffect, useRef, useState } from 'react';

import { createIdleTimer, type IdleTimer } from './idle-timer';
import { PIANO_BAR_HIDE_DELAY_MS } from './piano-overlay-model';

/**
 * Whether the full-screen bar's controls show. With auto-hide on they hide
 * after a few seconds without a touch; `wake` (call it on every touch) shows
 * them again and restarts the countdown. With it off they always show.
 */
export const useAutoHidingBar = (isAutoHideOn: boolean) => {
  const [isShown, setIsShown] = useState(true);
  const timer = useRef<IdleTimer | null>(null);

  useEffect(() => {
    setIsShown(true);

    if (!isAutoHideOn) {
      return undefined;
    }

    const idleTimer = createIdleTimer<ReturnType<typeof setTimeout>>(
      PIANO_BAR_HIDE_DELAY_MS,
      () => {
        setIsShown(false);
      },
      // Wrapped, not passed bare: a browser's timer functions throw
      // `Illegal invocation` when called as methods of another object.
      {
        clear: (handle) => {
          clearTimeout(handle);
        },
        set: (callback, delayMs) => setTimeout(callback, delayMs),
      },
    );

    timer.current = idleTimer;

    return () => {
      idleTimer.stop();
      timer.current = null;
    };
  }, [isAutoHideOn]);

  const wake = useCallback(() => {
    setIsShown(true);
    timer.current?.touch();
  }, []);

  return { isShown: isShown || !isAutoHideOn, wake };
};
