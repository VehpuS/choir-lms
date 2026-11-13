export type PianoWarmupEnvironment = {
  /** False on a data-saver setting or a very slow connection: do not spend data. */
  canSpendData: () => boolean;
  /** Runs the callback when the page is idle; returns a way to cancel it. */
  whenIdle: (callback: () => void) => () => void;
  /** Starts fetching the recordings. */
  warm: () => void;
};

/**
 * Fetches the piano recordings in the background soon after the app starts, so
 * the piano is ready when it is first opened, including on a fresh launch with
 * nothing cached. They are about 0.65 MB in all; a person who asked their
 * phone to save data, or is on a very slow connection, is left alone (the
 * piano then loads them when it opens). Returns a way to cancel.
 */
export const startPianoWarmup = (environment: PianoWarmupEnvironment) => {
  if (!environment.canSpendData()) {
    return () => undefined;
  }

  return environment.whenIdle(environment.warm);
};
