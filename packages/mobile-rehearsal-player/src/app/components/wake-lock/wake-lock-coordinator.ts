// The app's TypeScript config carries no DOM library, so the slice of the Screen
// Wake Lock API used here is described structurally and injected, which also
// lets the logic be tested without a browser.
export type WakeLockSentinelLike = {
  addEventListener(type: 'release', listener: () => void): void;
  release(): Promise<void>;
};

export type WakeLockEnvironment = {
  isVisible: () => boolean;
  /** Undefined where the browser has no Screen Wake Lock API. */
  request: (() => Promise<WakeLockSentinelLike>) | undefined;
  /** Calls the listener when the page becomes visible again. */
  onBecameVisible: (listener: () => void) => void;
};

/**
 * Keeps the screen awake while anything holds it. Several surfaces can hold at
 * once (playback, a score, lyrics); one lock serves them all and is let go when
 * the last holder leaves. The browser drops a lock when the page is hidden, so
 * it is asked for again on return. A refusal (low battery, no permission, an
 * unsupported browser) is not an error: the screen simply may sleep.
 */
export const createWakeLockCoordinator = (environment: WakeLockEnvironment) => {
  let holders = 0;
  let sentinel: WakeLockSentinelLike | null = null;
  let isRequesting = false;

  const acquire = () => {
    if (
      !environment.request ||
      sentinel ||
      isRequesting ||
      !environment.isVisible()
    ) {
      return;
    }

    isRequesting = true;
    environment
      .request()
      .then((granted) => {
        isRequesting = false;

        // Everyone let go while the browser was answering.
        if (holders === 0) {
          void granted.release().catch(() => undefined);

          return;
        }

        sentinel = granted;
        granted.addEventListener('release', () => {
          if (sentinel === granted) {
            sentinel = null;
          }
        });
      })
      .catch(() => {
        isRequesting = false;
      });
  };

  environment.onBecameVisible(() => {
    if (holders > 0) {
      acquire();
    }
  });

  return {
    /** Holds the screen awake; the returned function lets go (once). */
    hold: () => {
      let isHolding = true;

      holders += 1;
      acquire();

      return () => {
        if (!isHolding) {
          return;
        }

        isHolding = false;
        holders -= 1;

        if (holders === 0 && sentinel) {
          const current = sentinel;

          sentinel = null;
          void current.release().catch(() => undefined);
        }
      };
    },
  };
};
