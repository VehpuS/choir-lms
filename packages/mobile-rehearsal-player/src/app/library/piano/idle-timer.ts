/** The timer functions an idle timer needs, so a test can drive them by hand. */
export type TimerScheduler<Handle> = {
  clear: (handle: Handle) => void;
  set: (callback: () => void, delayMs: number) => Handle;
};

export type IdleTimer = {
  /** Stops the timer without calling `onIdle`. */
  stop: () => void;
  /** Restarts the countdown; call it on every touch. */
  touch: () => void;
};

/**
 * Calls `onIdle` once `delayMs` pass with no `touch()`. The full-screen piano
 * uses it to hide its bar after a few seconds without a touch. It starts
 * counting immediately, so a bar that is shown starts its countdown.
 */
export const createIdleTimer = <Handle>(
  delayMs: number,
  onIdle: () => void,
  scheduler: TimerScheduler<Handle>,
): IdleTimer => {
  let handle: Handle | null = null;

  const stop = () => {
    if (handle !== null) {
      scheduler.clear(handle);
      handle = null;
    }
  };
  const touch = () => {
    stop();
    handle = scheduler.set(() => {
      handle = null;
      onIdle();
    }, delayMs);
  };

  touch();

  return { stop, touch };
};
