export type KeepAwakeControls = {
  activate: (tag: string) => Promise<void>;
  deactivate: (tag: string) => Promise<void>;
};

/**
 * Asks to keep the screen on and returns the function that gives it back.
 * Keeping the screen awake is a nicety, and the platform may refuse it (a
 * browser denies the wake lock when the page is hidden or the permission is
 * blocked), so a refusal is ignored. The library's own hook leaves that
 * rejection unhandled, and its release throws when the lock never started.
 */
export const keepScreenAwake = (
  tag: string,
  controls: KeepAwakeControls,
): (() => void) => {
  controls.activate(tag).catch(() => undefined);

  return () => {
    controls.deactivate(tag).catch(() => undefined);
  };
};
