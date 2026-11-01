import type {
  Recording,
  RecordingTimelineSegment,
} from '@org/audio-library-models';

import type { VisibilitySource } from '../pitch/app-visibility';
import type { PcmSource } from '../pitch/pcm-source-types';
import { createRecorder, type Recorder } from './recorder';
import type { RecorderResult } from './recorder-types';
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
  | 'recording'
  | 'stopped';

export type RecordingSessionState = {
  phase: RecordingSessionPhase;
  elapsedMs: number;
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
  stop: () => Promise<void>;
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
  let activeRequest: RecordingStartRequest | null = null;

  const disposeRequest = () => {
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
    recorder = null;
    disposeRequest();
    set({
      phase: 'stopped',
      stopMessage: describeRecordingStop(result.reason, result.status),
      savedRecording: result.status === 'saved' ? saved : undefined,
      timeLeft: null,
    });
  };

  const begin = async (build: () => Promise<RecordingStartRequest>) => {
    const request = await build();

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
      onStopped: (result) => toStopped(result, saved),
    });
    const started = await next.start();

    if (started.ok) {
      recorder = next;
      set({
        phase: 'recording',
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
      if (state.phase === 'recording' || state.phase === 'explain') {
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
    confirmExplanation: async () => {
      const build = pending;

      pending = null;
      await deps.storage
        .setItem(RECORDING_EXPLAINED_KEY, EXPLAINED_VALUE)
        .catch(() => undefined);
      set({ phase: 'idle' });

      if (build) {
        await begin(build);
      }
    },
    dismiss: () => {
      pending = null;
      set({ phase: 'idle', stopMessage: undefined, blockedReason: undefined });
    },
    stop: async () => {
      await recorder?.stop('user');
    },
  };
};
