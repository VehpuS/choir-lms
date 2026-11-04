import {
  IDLE_PUNCH,
  stepPunch,
  type PunchEffect,
  type PunchEvent,
  type PunchState,
} from './punch-machine.ts';
import type { PunchRange } from './punch-range.ts';
import type { SyncTimers, Transport } from './sync-controller.ts';

/**
 * Runs an armed punch recording against the playing track (rehearsal-recording
 * design Decision 18). It follows the track's `Transport`, polls its position
 * while a punch is live, feeds both to the state machine, and carries out the
 * effects through two small interfaces: the playback side (seek, play, pause)
 * and the recording side (start, stop). The in point is read from the same
 * position tracking as the recording's timeline, so the first sample lands
 * within the same tolerance as a manual start.
 */

export type PunchPlayback = {
  seek: (ms: number) => void;
  play: () => void;
  pause: () => void;
};

export type PunchRecorder = {
  start: () => void;
  stop: () => void;
};

export type PunchControllerOptions = {
  transport: Transport;
  playback: PunchPlayback;
  recorder: PunchRecorder;
  /** Track seconds per second; 1 unless the track is shaped. */
  getRate?: () => number;
  timers?: SyncTimers;
  pollMs?: number;
};

export type PunchController = {
  getState: () => PunchState;
  subscribe: (listener: () => void) => () => void;
  arm: (range: PunchRange) => void;
  /** `Play from pre-roll`. */
  playFromPreRoll: () => void;
  /** `Stop` or `Disarm`. */
  stop: () => void;
  /** Back to ready after a finished punch. */
  reset: () => void;
  dispose: () => void;
};

/** Often enough that the in point is caught within the machine's tolerance at any track speed. */
export const DEFAULT_PUNCH_POLL_MS = 50;

const defaultTimers: SyncTimers = {
  clearInterval: (handle) =>
    globalThis.clearInterval(handle as ReturnType<typeof setInterval>),
  setInterval: (callback, ms) => globalThis.setInterval(callback, ms),
};

const isLive = (state: PunchState) =>
  state.phase === 'armed' ||
  state.phase === 'countdown' ||
  state.phase === 'recording';

export const createPunchController = (
  options: PunchControllerOptions,
): PunchController => {
  const { playback, recorder, transport } = options;
  const timers = options.timers ?? defaultTimers;
  const getRate = options.getRate ?? (() => 1);
  const listeners = new Set<() => void>();
  let state = IDLE_PUNCH;
  let pollHandle: unknown = null;
  let isDisposed = false;

  const runEffect = (effect: PunchEffect) => {
    switch (effect.type) {
      case 'seek':
        playback.seek(effect.ms);
        break;
      case 'play':
        playback.play();
        break;
      case 'pause':
        playback.pause();
        break;
      case 'start-recording':
        recorder.start();
        break;
      case 'stop-recording':
        recorder.stop();
        break;
    }
  };

  const syncPolling = () => {
    if (isLive(state) && pollHandle === null && !isDisposed) {
      pollHandle = timers.setInterval(
        () => dispatch(tickEvent()),
        options.pollMs ?? DEFAULT_PUNCH_POLL_MS,
      );
    } else if (!isLive(state) && pollHandle !== null) {
      timers.clearInterval(pollHandle);
      pollHandle = null;
    }
  };

  function dispatch(event: PunchEvent) {
    if (isDisposed) {
      return;
    }

    const step = stepPunch(state, event);
    const changed = step.state !== state;

    state = step.state;
    syncPolling();
    step.effects.forEach(runEffect);

    if (changed) {
      listeners.forEach((listener) => listener());
    }
  }

  function tickEvent(): PunchEvent {
    return {
      playing: transport.isPlaying(),
      positionMs: transport.getPositionMs(),
      rate: getRate(),
      type: 'tick',
    };
  }

  const stopFollowing = transport.subscribe((event) => {
    if (!isLive(state)) {
      return;
    }

    if (event === 'play') {
      dispatch({ positionMs: transport.getPositionMs(), type: 'play' });
    } else if (event === 'loop') {
      dispatch({ type: 'loop-wrap' });
    }

    dispatch(tickEvent());
  });

  return {
    arm: (range) => dispatch({ range, type: 'arm' }),
    dispose: () => {
      isDisposed = true;
      stopFollowing();

      if (pollHandle !== null) {
        timers.clearInterval(pollHandle);
        pollHandle = null;
      }

      listeners.clear();
    },
    getState: () => state,
    playFromPreRoll: () => dispatch({ type: 'play-from-pre-roll' }),
    reset: () => dispatch({ type: 'reset' }),
    stop: () => dispatch({ type: 'stop' }),
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};
