import type {
  Recording,
  RecordingTimelineSegment,
} from '@org/audio-library-models';

import type { Transport } from '@org/audio-mixing';

import type { VisibilitySource } from '../pitch/app-visibility';
import type { PcmSource } from '../pitch/pcm-source-types';
import { createRecorder, type Recorder } from './recorder';
import type { RecorderResult, RecordingStopReason } from './recorder-types';
import type { RecordingDraft } from './recording-metadata';
import {
  describeRecordingStop,
  type RecordingStopMessage,
} from './recording-stop-messages';
import {
  getTimeLeftReadout,
  readRecordingTimeLeft,
  type StorageEstimateSource,
  type TimeLeftReadout,
} from './recording-storage-limit';
import { createRecordingWriter } from './recording-writer';
import type { RecordingsStore } from './recordings-store-types';

export const RECORDING_EXPLAINED_KEY = 'choirlms.recording.explained';
const EXPLAINED_VALUE = 'true';
/** Before any audio arrives the sample rate is unknown; matches the recorder's pre-check. */
const PRECHECK_SAMPLE_RATE = 48_000;

export type RecordingFlagStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export type RecordingSessionPhase =
  | 'idle'
  | 'explain'
  | 'blocked'
  | 'refused'
  /** Record was pressed while the track was not playing; nothing is kept yet. */
  | 'armed'
  | 'recording'
  | 'stopped';

export type RecordingSessionState = {
  phase: RecordingSessionPhase;
  elapsedMs: number;
  /** The take is paused because its track is (phase `recording` only). */
  paused?: boolean;
  /** Only present when the time left matters (under 30 minutes). */
  timeLeft: TimeLeftReadout | null;
  blockedReason?: 'denied' | 'in-use' | 'unavailable';
  stopMessage?: RecordingStopMessage;
  /** The recording just saved, for the save sheet. */
  savedRecording?: Recording;
};

/** What starting a recording needs from the playback side. */
export type RecordingStartRequest = {
  draft: RecordingDraft;
  /** The timeline as it stands at `elapsedMs` of the recording. */
  getTimeline: (elapsedMs: number) => RecordingTimelineSegment[];
  /** The first sample's `performance.now()` time, to anchor the timeline to. */
  onCaptureStart?: (wallMs: number) => void;
  /**
   * The track's transport. The take follows it: it waits for play when armed,
   * pauses with a pause, and continues on resume (design Decision 17).
   * Without one the take just runs.
   */
  transport?: Transport;
  /** Releases what tracks the transport; called once the recording is over or never began. */
  dispose?: () => void;
};

export type RecordingSessionDependencies = {
  source: PcmSource;
  store: RecordingsStore;
  estimate: StorageEstimateSource;
  storage: RecordingFlagStorage;
  visibility?: VisibilitySource;
  createRecorderImpl?: typeof createRecorder;
};

export type RecordingSession = {
  getState: () => RecordingSessionState;
  subscribe: (listener: () => void) => () => void;
  /** Reads free storage so the strip can show the time left when it matters. */
  refreshStorage: () => Promise<void>;
  /**
   * Starts a recording, after the one-time explanation. `build` runs only once
   * the user has agreed, so nothing is captured from the track before then.
   */
  requestStart: (build: () => Promise<RecordingStartRequest>) => Promise<void>;
  confirmExplanation: () => Promise<void>;
  /** Cancels the explanation or clears a message, back to ready. */
  dismiss: () => void;
  /** Stops the take, keeping what was captured; `out-point` when a punch range ended it. */
  stop: (reason?: RecordingStopReason) => Promise<void>;
  /**
   * Runs `proceed` once the first-time explanation is done: at once if it
   * already is, else after the user continues. Arming a punch range goes
   * through it, because the explanation cannot interrupt a take.
   */
  afterExplanation: (proceed: () => void) => Promise<void>;
};

const INITIAL_STATE: RecordingSessionState = {
  phase: 'idle',
  elapsedMs: 0,
  timeLeft: null,
};

/**
 * The recording strip's state machine (rehearsal-recording design Decision 8):
 * ready, the first-time explanation, a blocked or refused start, recording,
 * and the message after it stops. It owns the recorder and the store writer;
 * what a recording is about (the track, its timeline) comes from the caller.
 */
export const createRecordingSession = (
  deps: RecordingSessionDependencies,
): RecordingSession => {
  const makeRecorder = deps.createRecorderImpl ?? createRecorder;
  const listeners = new Set<() => void>();
  let state = INITIAL_STATE;
  let recorder: Recorder | null = null;
  let pending: (() => Promise<RecordingStartRequest>) | null = null;
  let afterExplained: (() => void) | null = null;
  let activeRequest: RecordingStartRequest | null = null;
  let unfollowTransport: (() => void) | null = null;

  const disposeRequest = () => {
    unfollowTransport?.();
    unfollowTransport = null;
    activeRequest?.dispose?.();
    activeRequest = null;
  };

  const set = (
    next: Partial<RecordingSessionState> & { phase?: RecordingSessionPhase },
  ) => {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  };

  const toStopped = (result: RecorderResult, saved?: Recording) => {
    const wasArmed = state.phase === 'armed';

    recorder = null;
    disposeRequest();

    // Stopping before the track ever played is disarming, not a failed take.
    if (wasArmed && result.status === 'discarded') {
      set({ phase: 'idle', paused: undefined, timeLeft: null });

      return;
    }

    set({
      phase: 'stopped',
      stopMessage: describeRecordingStop(result.reason, result.status),
      savedRecording: result.status === 'saved' ? saved : undefined,
      timeLeft: null,
    });
  };

  /** Starts, pauses and resumes the take with its track. */
  const followTransport = (take: Recorder, transport?: Transport) => {
    if (!transport) {
      return;
    }

    unfollowTransport = transport.subscribe(() => {
      if (transport.isPlaying()) {
        take.resume();
        set({ phase: 'recording', paused: false });
      } else if (transport.hasEnded?.()) {
        // The track ran out: the take ends with it (design Decision 8).
        void take.stop('track-ended');
      } else {
        take.pause();

        if (state.phase === 'recording') {
          set({ paused: true });
        }
      }
    });
  };

  const begin = async (build: () => Promise<RecordingStartRequest>) => {
    const request = await build();
    // A take with no transport just runs; with one it starts when the track plays.
    const isPlaying = request.transport?.isPlaying() ?? true;

    activeRequest = request;
    let saved: Recording | undefined;
    const writer = createRecordingWriter({
      store: deps.store,
      draft: request.draft,
      getTimeline: request.getTimeline,
      onSaved: (recording) => {
        saved = recording;
      },
    });
    const next = makeRecorder({
      source: deps.source,
      writer,
      estimate: deps.estimate,
      visibility: deps.visibility,
      onProgress: (progress) => {
        set({
          elapsedMs: progress.elapsedMs,
          timeLeft:
            progress.timeLeftMs === undefined
              ? null
              : getTimeLeftReadout({
                  state:
                    progress.storageState === 'unknown'
                      ? 'ok'
                      : progress.storageState,
                  timeLeftMs: progress.timeLeftMs,
                }),
        });
      },
      onCaptureStart: request.onCaptureStart,
      startPaused: !isPlaying,
      onStopped: (result) => toStopped(result, saved),
    });
    const started = await next.start();

    if (started.ok) {
      recorder = next;
      followTransport(next, request.transport);
      set({
        phase: isPlaying ? 'recording' : 'armed',
        paused: false,
        elapsedMs: 0,
        stopMessage: undefined,
        savedRecording: undefined,
      });

      return;
    }

    disposeRequest();

    if (started.reason === 'storage-low') {
      set({ phase: 'refused', timeLeft: null });
    } else {
      set({ phase: 'blocked', blockedReason: started.reason });
    }
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    refreshStorage: async () => {
      if (state.phase !== 'idle') {
        return;
      }

      const left = await readRecordingTimeLeft(
        deps.estimate,
        PRECHECK_SAMPLE_RATE,
      );

      set({ timeLeft: getTimeLeftReadout(left) });
    },
    requestStart: async (build) => {
      if (
        state.phase === 'recording' ||
        state.phase === 'armed' ||
        state.phase === 'explain'
      ) {
        return;
      }

      const explained = await deps.storage
        .getItem(RECORDING_EXPLAINED_KEY)
        .catch(() => null);

      if (explained !== EXPLAINED_VALUE) {
        pending = build;
        set({ phase: 'explain' });

        return;
      }

      await begin(build);
    },
    afterExplanation: async (proceed) => {
      const explained = await deps.storage
        .getItem(RECORDING_EXPLAINED_KEY)
        .catch(() => null);

      if (explained === EXPLAINED_VALUE) {
        proceed();

        return;
      }

      pending = null;
      afterExplained = proceed;
      set({ phase: 'explain' });
    },
    confirmExplanation: async () => {
      const build = pending;
      const proceed = afterExplained;

      pending = null;
      afterExplained = null;
      await deps.storage
        .setItem(RECORDING_EXPLAINED_KEY, EXPLAINED_VALUE)
        .catch(() => undefined);
      set({ phase: 'idle' });

      if (build) {
        await begin(build);
      }

      proceed?.();
    },
    dismiss: () => {
      pending = null;
      afterExplained = null;
      set({ phase: 'idle', stopMessage: undefined, blockedReason: undefined });
    },
    stop: async (reason = 'user') => {
      await recorder?.stop(reason);
    },
  };
};
