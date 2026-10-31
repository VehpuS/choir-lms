import {
  getRecordingTimesAtTrackPosition,
  type Recording,
} from '@org/audio-library-models';

/**
 * Keeps a recording's voice in step with the track (rehearsal-recording design
 * Decision 5). It depends on two small interfaces, not on Web Audio, so stems
 * from `composite-tracks` can sit behind the same controller.
 */

export type TransportEvent = 'play' | 'pause' | 'seek' | 'loop';

export type Transport = {
  /** Track position in original-audio milliseconds. */
  getPositionMs: () => number;
  isPlaying: () => boolean;
  /** Reports play, pause, seek and loop wrap; returns an unsubscribe. */
  subscribe: (listener: (event: TransportEvent) => void) => () => void;
};

export type Voice = {
  /** Starts (or restarts, crossfading) the recording at this position. */
  start: (recordingMs: number) => void;
  stop: () => void;
  /** Where the recording is now, or `null` when it is not sounding. */
  getPositionMs: () => number | null;
};

export type SyncTimers = {
  setInterval: (callback: () => void, ms: number) => unknown;
  clearInterval: (handle: unknown) => void;
};

export type SyncRecording = Pick<Recording, 'nudgeMs' | 'shaping' | 'timeline'>;

export type SyncControllerOptions = {
  transport: Transport;
  voice: Voice;
  recording: SyncRecording;
  timers?: SyncTimers;
  driftToleranceMs?: number;
  driftCheckMs?: number;
};

export type SyncController = {
  /** Changes the nudge while playing; the next sync applies it at once. */
  setNudgeMs: (nudgeMs: number) => void;
  dispose: () => void;
};

export const DEFAULT_DRIFT_TOLERANCE_MS = 20;
export const DEFAULT_DRIFT_CHECK_MS = 250;

const defaultTimers: SyncTimers = {
  setInterval: (callback, ms) => globalThis.setInterval(callback, ms),
  clearInterval: (handle) =>
    globalThis.clearInterval(handle as ReturnType<typeof setInterval>),
};

/**
 * A positive nudge plays the recording later against the track, so the
 * recording position is the looked-up time minus the nudge.
 */
export const applyNudgeMs = (recordingMs: number, nudgeMs: number) => {
  return recordingMs - nudgeMs;
};

export const createSyncController = (
  options: SyncControllerOptions,
): SyncController => {
  const { transport, voice, recording } = options;
  const timers = options.timers ?? defaultTimers;
  const tolerance = options.driftToleranceMs ?? DEFAULT_DRIFT_TOLERANCE_MS;
  let nudgeMs = recording.nudgeMs;
  // Pass n of a loop plays pass n of the recording; a seek starts over.
  let pass = 0;

  /** Where the recording should be now, or `null` when it should be silent. */
  const expectedMs = (): number | null => {
    if (!transport.isPlaying()) {
      return null;
    }

    const times = getRecordingTimesAtTrackPosition(
      recording,
      transport.getPositionMs(),
    );
    const time = times[pass];

    return time === undefined ? null : Math.max(0, applyNudgeMs(time, nudgeMs));
  };

  const sync = (force: boolean) => {
    const expected = expectedMs();
    const actual = voice.getPositionMs();

    if (expected === null) {
      if (actual !== null) {
        voice.stop();
      }
      return;
    }

    if (force || actual === null || Math.abs(actual - expected) > tolerance) {
      voice.start(expected);
    }
  };

  const unsubscribe = transport.subscribe((event) => {
    if (event === 'loop') {
      pass += 1;
    } else if (event === 'seek') {
      pass = 0;
    }

    // Any transport event reschedules: a source node cannot seek.
    sync(event !== 'pause');
  });
  const handle = timers.setInterval(
    () => sync(false),
    options.driftCheckMs ?? DEFAULT_DRIFT_CHECK_MS,
  );

  sync(true);

  return {
    setNudgeMs: (value) => {
      nudgeMs = value;
      sync(true);
    },
    dispose: () => {
      unsubscribe();
      timers.clearInterval(handle);
      voice.stop();
    },
  };
};
