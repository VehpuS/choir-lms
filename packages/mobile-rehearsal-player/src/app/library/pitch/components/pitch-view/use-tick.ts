import { useEffect, useState } from 'react';

/** How often the roll redraws, so it keeps scrolling through silence. */
export const PITCH_VIEW_TICK_MS = 100;

/** Re-renders its caller on an interval while `isActive`. */
export const useTick = (isActive: boolean, intervalMs = PITCH_VIEW_TICK_MS) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const timer = setInterval(() => setTick((tick) => tick + 1), intervalMs);

    return () => clearInterval(timer);
  }, [isActive, intervalMs]);
};
