import { getPlayFromMs, type PunchRange } from './punch-range.ts';

/**
 * The armed punch recording as a pure state machine (rehearsal-recording design
 * Decision 18): armed, a countdown while the pre-roll plays, recording between
 * `In` and `Out`, and the ways it ends. `stepPunch` takes a state and an event
 * and returns the next state with the effects to run (seek, play, pause, start
 * or stop recording), so the controller only carries them out and every
 * transition is tested without a clock.
 */

/** How far past `In` a play may begin and still start the take there; beyond it the play is sent back to the pre-roll. */
export const PUNCH_START_TOLERANCE_MS = 150;

export type PunchPhase =
  | 'idle'
  | 'armed'
  | 'countdown'
  | 'recording'
  | 'stopped-at-out'
  | 'disarmed'
  | 'stopped-early';

export type PunchState = {
  phase: PunchPhase;
  range?: PunchRange;
  /** Whole seconds until recording starts, while the pre-roll plays. */
  countdownSeconds?: number;
  /** Wall-clock time until `Out`, while recording. */
  remainingMs?: number;
};

export type PunchEvent =
  | { type: 'arm'; range: PunchRange }
  /** `Play from pre-roll`: go to the pre-roll and play. */
  | { type: 'play-from-pre-roll' }
  /** The track started playing. */
  | { type: 'play'; positionMs: number }
  /** The position as polled; `rate` is track seconds per second. */
  | { type: 'tick'; positionMs: number; playing: boolean; rate: number }
  /** The loop wrapped from its end back to its start. */
  | { type: 'loop-wrap' }
  /** `Stop` or `Disarm`. */
  | { type: 'stop' }
  /** Leaves a finished punch and returns to ready. */
  | { type: 'reset' };

export type PunchEffect =
  | { type: 'seek'; ms: number }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'start-recording' }
  | { type: 'stop-recording' };

export type PunchStep = { state: PunchState; effects: PunchEffect[] };

export const IDLE_PUNCH: PunchState = { phase: 'idle' };

const MS_PER_SECOND = 1_000;

const isWaiting = (phase: PunchPhase) =>
  phase === 'armed' || phase === 'countdown';

const isLive = (phase: PunchPhase) => isWaiting(phase) || phase === 'recording';

const unchanged = (state: PunchState): PunchStep => ({ effects: [], state });

const stepWaiting = (
  state: PunchState & { range: PunchRange },
  event: PunchEvent,
): PunchStep => {
  const { range } = state;
  const playFrom = getPlayFromMs(range);

  if (event.type === 'play-from-pre-roll') {
    return {
      effects: [{ ms: playFrom, type: 'seek' }, { type: 'play' }],
      state,
    };
  }

  if (event.type === 'play') {
    // A play from outside the pre-roll goes to it instead.
    return event.positionMs < playFrom ||
      event.positionMs > range.inMs + PUNCH_START_TOLERANCE_MS
      ? { effects: [{ ms: playFrom, type: 'seek' }], state }
      : unchanged(state);
  }

  if (event.type !== 'tick') {
    return unchanged(state);
  }

  const { playing, positionMs, rate } = event;

  if (!playing) {
    return unchanged({ phase: 'armed', range });
  }

  // Having counted down through the pre-roll, a late poll (a busy or throttled
  // page) still starts the take: its timeline holds the true start position.
  // Without that run-up only a play that begins right at the in point does.
  const isPastIn =
    positionMs >= range.inMs &&
    positionMs < range.outMs &&
    (state.phase === 'countdown' ||
      positionMs <= range.inMs + PUNCH_START_TOLERANCE_MS);

  if (isPastIn) {
    return {
      effects: [{ type: 'start-recording' }],
      state: {
        phase: 'recording',
        range,
        remainingMs: Math.max(0, (range.outMs - positionMs) / rate),
      },
    };
  }

  if (positionMs >= playFrom && positionMs < range.inMs) {
    return {
      effects: [],
      state: {
        countdownSeconds: Math.ceil(
          (range.inMs - positionMs) / rate / MS_PER_SECOND,
        ),
        phase: 'countdown',
        range,
      },
    };
  }

  return unchanged({ phase: 'armed', range });
};

const stopAtOut = (state: PunchState & { range: PunchRange }): PunchStep => ({
  effects: [
    { type: 'stop-recording' },
    ...(state.range.keepPlayingAfterOut ? [] : [{ type: 'pause' } as const]),
  ],
  state: { phase: 'stopped-at-out', range: state.range },
});

const stepRecording = (
  state: PunchState & { range: PunchRange },
  event: PunchEvent,
): PunchStep => {
  const { range } = state;

  // A loop recording is one pass: the wrap at the loop's end is the out point.
  if (event.type === 'loop-wrap') {
    return range.loop ? stopAtOut(state) : unchanged(state);
  }

  if (event.type !== 'tick') {
    return unchanged(state);
  }

  if (event.positionMs >= range.outMs) {
    return stopAtOut(state);
  }

  return event.playing
    ? unchanged({
        ...state,
        remainingMs: Math.max(0, (range.outMs - event.positionMs) / event.rate),
      })
    : unchanged(state);
};

export const stepPunch = (state: PunchState, event: PunchEvent): PunchStep => {
  if (event.type === 'reset') {
    return unchanged(IDLE_PUNCH);
  }

  if (event.type === 'arm') {
    return isLive(state.phase)
      ? unchanged(state)
      : unchanged({ phase: 'armed', range: event.range });
  }

  const { range } = state;

  if (!range || !isLive(state.phase)) {
    return unchanged(state);
  }

  if (event.type === 'stop') {
    return state.phase === 'recording'
      ? {
          effects: [{ type: 'stop-recording' }],
          state: { phase: 'stopped-early', range },
        }
      : unchanged({ phase: 'disarmed', range });
  }

  const live = { ...state, range };

  return state.phase === 'recording'
    ? stepRecording(live, event)
    : stepWaiting(live, event);
};
