export type RunnerScheduler = {
  clearTimeout: (handle: unknown) => void;
  now: () => number;
  setTimeout: (callback: () => void, delayMs: number) => unknown;
};

const SYSTEM_SCHEDULER: RunnerScheduler = {
  clearTimeout: (handle) => clearTimeout(handle as never),
  now: () => Date.now(),
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
};

type Waiter = {
  reject: (error: unknown) => void;
  resolve: () => void;
};

export type CoalescedRunner = {
  /**
   * Asks for a run. Requests made while a run is in flight or inside the
   * minimum interval share the next run, which reads the latest state when it
   * starts; the returned promise settles when a run that began after this
   * request has finished.
   */
  request: () => Promise<void>;
  /** Like `request`, but starts without waiting for the interval. */
  runNow: () => Promise<void>;
};

/**
 * Drives something expensive, such as a media player's rate, at a bounded
 * pace without ever losing the latest value: runs never overlap, the first
 * request runs at once, and a burst of requests collapses into one trailing
 * run. A slider drag is dozens of events a second; the player needs the
 * newest value at a steady few per second, and every change it is given
 * re-synchronizes its audio.
 */
export const createCoalescedRunner = (
  run: () => Promise<void>,
  options: { minIntervalMs: number; scheduler?: RunnerScheduler },
): CoalescedRunner => {
  const scheduler = options.scheduler ?? SYSTEM_SCHEDULER;
  let isRunning = false;
  let lastStartedAt = Number.NEGATIVE_INFINITY;
  let pending: Waiter[] = [];
  let shouldSkipInterval = false;
  let timer: unknown = null;

  const start = () => {
    timer = null;
    shouldSkipInterval = false;
    const waiters = pending;

    pending = [];
    isRunning = true;
    lastStartedAt = scheduler.now();

    run()
      .then(
        () => waiters.forEach((waiter) => waiter.resolve()),
        (error: unknown) => waiters.forEach((waiter) => waiter.reject(error)),
      )
      .finally(() => {
        isRunning = false;

        if (pending.length > 0) {
          schedule();
        }
      });
  };

  const schedule = () => {
    if (isRunning || timer !== null) {
      return;
    }

    const waitMs = shouldSkipInterval
      ? 0
      : Math.max(0, lastStartedAt + options.minIntervalMs - scheduler.now());

    if (waitMs === 0) {
      start();
      return;
    }

    timer = scheduler.setTimeout(start, waitMs);
  };

  return {
    request: () => {
      return new Promise<void>((resolve, reject) => {
        pending.push({ reject, resolve });
        schedule();
      });
    },
    runNow: () => {
      return new Promise<void>((resolve, reject) => {
        pending.push({ reject, resolve });
        shouldSkipInterval = true;

        if (timer !== null) {
          scheduler.clearTimeout(timer);
          timer = null;
        }

        schedule();
      });
    },
  };
};
