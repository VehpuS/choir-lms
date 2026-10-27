import {
  createPitchPipeline,
  createPitchyEstimator,
  type Sensitivity,
} from '@org/pitch-detection';
import { DEFAULT_REFERENCE_HZ } from '@org/audio-library-models';

import type { VisibilitySource } from './app-visibility';
import { PcmSourceError, type PcmSource } from './pcm-source-types';
import {
  AUTO_START_STATUSES,
  FAILURE_STATUS,
  FAILURE_STATUSES,
  FLAG_ON,
  IDLE_READING,
  PITCH_EXPLAINED_KEY,
  PITCH_HEADPHONES_DISMISSED_KEY,
  PITCH_RETRY_MS,
  type PitchFlagStorage,
  type PitchState,
} from './pitch-store-types';

export * from './pitch-store-types';

export type PitchStore = {
  getState: () => PitchState;
  subscribe: (listener: () => void) => () => void;
  /** Registers a mounted consumer; listening stops when the last releases. */
  acquire: () => () => void;
  /** The user pressed `Listen`. */
  requestListen: () => Promise<void>;
  /** The user accepted the explanation; this raises the system prompt. */
  confirmExplanation: () => Promise<void>;
  stopListening: () => void;
  dismissHeadphonesNote: () => void;
  dismissBackgroundNotice: () => void;
  setSensitivity: (sensitivity: Sensitivity) => void;
  setReferenceHz: (referenceHz: number) => void;
};

export const createPitchStore = ({
  source,
  visibility,
  storage,
}: {
  source: PcmSource;
  visibility: VisibilitySource;
  storage: PitchFlagStorage;
}): PitchStore => {
  const pipeline = createPitchPipeline({ estimator: createPitchyEstimator() });
  const listeners = new Set<() => void>();
  let consumers = 0;
  let explained = false;
  let headphonesDismissed = false;
  let stopCapture: (() => void) | null = null;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let pausedInBackground = false;
  let state: PitchState = {
    status: 'off',
    listening: false,
    permission: 'unknown',
    reading: IDLE_READING,
    headphonesNotePending: false,
    backgroundNoticePending: false,
    sensitivity: 'normal',
    referenceHz: DEFAULT_REFERENCE_HZ,
  };

  const flagsLoaded = Promise.all([
    storage.getItem(PITCH_EXPLAINED_KEY),
    storage.getItem(PITCH_HEADPHONES_DISMISSED_KEY),
  ])
    .then(([explainedValue, dismissedValue]) => {
      explained = explainedValue === FLAG_ON;
      headphonesDismissed = dismissedValue === FLAG_ON;
    })
    .catch(() => undefined);

  const saveFlag = (key: string) => {
    void storage.setItem(key, FLAG_ON).catch(() => undefined);
  };

  const update = (patch: Partial<PitchState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };

  const clearRetry = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const releaseCapture = () => {
    attempt += 1;
    clearRetry();
    stopCapture?.();
    stopCapture = null;
    pipeline.reset();
  };

  const begin = async () => {
    const thisAttempt = (attempt += 1);

    update({ status: 'starting' });

    try {
      const unsubscribe = await source.subscribe({
        onFrame: (frame) => {
          if (thisAttempt !== attempt) {
            return;
          }

          const reading = pipeline.process({
            samples: frame.samples,
            sampleRate: frame.sampleRate,
            timestampMs: frame.captureTimeSec * 1000,
          });

          // Idle frames are the common case while nobody sings; skip them.
          if (reading.active || state.reading.active) {
            update({ reading });
          }
        },
        onInterrupted: () => {
          if (thisAttempt === attempt) {
            update({ status: 'interrupted' });
          }
        },
        onRecovered: () => {
          if (thisAttempt === attempt) {
            update({ status: 'listening' });
          }
        },
        onEnded: () => {
          if (thisAttempt !== attempt) {
            return;
          }

          stopCapture = null;
          pipeline.reset();
          update({ status: 'interrupted', reading: IDLE_READING });
          retryTimer = setTimeout(() => reconcile(false), PITCH_RETRY_MS);
        },
      });

      if (thisAttempt !== attempt) {
        // Stopped or superseded while the microphone was opening.
        unsubscribe();

        return;
      }

      stopCapture = unsubscribe;
      await flagsLoaded;
      update({
        status: 'listening',
        permission: 'granted',
        headphonesNotePending: !headphonesDismissed,
        backgroundNoticePending: pausedInBackground,
      });
      pausedInBackground = false;
    } catch (error) {
      if (thisAttempt !== attempt) {
        return;
      }

      const reason =
        error instanceof PcmSourceError ? error.reason : 'unavailable';

      update({
        status: FAILURE_STATUS[reason],
        permission: reason === 'denied' ? 'denied' : state.permission,
      });
    }
  };

  // Decides whether capture should run and starts or stops it. `force` is a
  // user press, which retries even after a failure; other triggers do not.
  const reconcile = (force: boolean) => {
    const wanted = state.listening && consumers > 0;

    if (!wanted) {
      releaseCapture();
      update({ status: 'off', reading: IDLE_READING });

      return;
    }

    if (!visibility.isVisible()) {
      // A refusal or a missing microphone stays as it is: coming back to the
      // app must not retry (or prompt) until the user presses `Listen`.
      if (
        state.status !== 'paused-hidden' &&
        !FAILURE_STATUSES.includes(state.status)
      ) {
        releaseCapture();
        pausedInBackground = true;
        update({ status: 'paused-hidden', reading: IDLE_READING });
      }

      return;
    }

    const running = stopCapture !== null || state.status === 'starting';

    if (!running && (force || AUTO_START_STATUSES.includes(state.status))) {
      void begin();
    }
  };

  visibility.subscribe(() => reconcile(false));

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    acquire: () => {
      consumers += 1;
      reconcile(false);
      let released = false;

      return () => {
        if (released) {
          return;
        }

        released = true;
        consumers -= 1;
        reconcile(false);
      };
    },
    requestListen: async () => {
      update({ listening: true });
      await flagsLoaded;

      const permission = await source.queryPermission();

      update({ permission });

      if (permission !== 'granted' && !explained) {
        update({ status: 'explain' });

        return;
      }

      reconcile(true);
    },
    confirmExplanation: async () => {
      explained = true;
      saveFlag(PITCH_EXPLAINED_KEY);
      reconcile(true);
    },
    stopListening: () => {
      update({ listening: false });
      reconcile(false);
    },
    dismissHeadphonesNote: () => {
      headphonesDismissed = true;
      saveFlag(PITCH_HEADPHONES_DISMISSED_KEY);
      update({ headphonesNotePending: false });
    },
    dismissBackgroundNotice: () => update({ backgroundNoticePending: false }),
    setSensitivity: (sensitivity) => {
      pipeline.setSensitivity(sensitivity);
      update({ sensitivity });
    },
    setReferenceHz: (referenceHz) => {
      pipeline.setReferenceHz(referenceHz);
      update({ referenceHz });
    },
  };
};
