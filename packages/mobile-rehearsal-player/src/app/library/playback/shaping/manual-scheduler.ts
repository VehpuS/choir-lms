import type { RunnerScheduler } from './coalesced-runner';

/**
 * A manual clock for tests: timers fire only when the test advances time, so
 * pacing is deterministic. `advance` also lets pending promise work finish.
 */
export const createManualScheduler = () => {
  let nowMs = 0;
  let nextHandle = 1;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const scheduler: RunnerScheduler = {
    clearTimeout: (handle) => void timers.delete(handle as number),
    now: () => nowMs,
    setTimeout: (callback, delayMs) => {
      const handle = nextHandle++;

      timers.set(handle, { at: nowMs + delayMs, callback });
      return handle;
    },
  };
  const advance = async (ms: number) => {
    nowMs += ms;
    for (const [handle, timer] of [...timers]) {
      if (timer.at <= nowMs) {
        timers.delete(handle);
        timer.callback();
      }
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  };

  return { advance, scheduler };
};
