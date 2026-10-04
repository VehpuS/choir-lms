import {
  DEFAULT_PLAYBACK_SHAPING,
  clampPitchSemitones,
  clampSpeedMultiplier,
  type PlaybackShaping,
} from '@org/audio-library-models';

import {
  createCoalescedRunner,
  type RunnerScheduler,
} from './coalesced-runner';
import type { PlaybackShapingEngine } from './playback-shaping-types';

type ShapingAxes = Pick<PlaybackShaping, 'pitchSemitones' | 'speedMultiplier'>;

/**
 * A transform an item carries itself (an adjusted track or loop, tasks 6.3).
 * It applies for that item's playback only and never becomes the ambient
 * shaping, so the rest of the queue keeps the ambient settings.
 */
export type ItemShapingTransform = ShapingAxes;

export type PlaybackShapingSessionState = {
  /** What the user set for the session; carried through a queue. */
  ambient: ShapingAxes;
  canShapePitch: boolean;
  /** What is actually applied: the item's own transform, else the ambient. */
  effective: ShapingAxes;
  /** Whether the playing item's own transform is overriding the ambient. */
  isItemTransformActive: boolean;
};

export type PlaybackShapingSession = {
  getState: () => PlaybackShapingSessionState;
  /**
   * Makes the engine match the effective shaping for the item that just
   * loaded. The player resets between items and may drop the rate, so this
   * runs after every load (and rewrites both values), not only when the user
   * changes a setting.
   */
  applyForLoadedItem: (
    itemTransform?: ItemShapingTransform | null,
  ) => Promise<void>;
  /** A user-initiated start (not a queue advance): back to 1.00× and 0 st. */
  startNewPlayback: () => void;
  reset: () => Promise<void>;
  setPitchSemitones: (semitones: number) => Promise<void>;
  setSpeedMultiplier: (multiplier: number) => Promise<void>;
  subscribe: (listener: () => void) => () => void;
};

const NEUTRAL_AXES: ShapingAxes = {
  pitchSemitones: DEFAULT_PLAYBACK_SHAPING.pitchSemitones,
  speedMultiplier: DEFAULT_PLAYBACK_SHAPING.speedMultiplier,
};

/**
 * Setting changes reach the player at most this often. A slider drag is dozens
 * of events a second and every rate or pitch change makes the player
 * re-synchronize its audio (AVPlayer, ExoPlayer and the browser's time-stretch
 * all do), so an unthrottled drag is heard as stutter and jumps in speed. The
 * displayed value still follows the finger at once, and the latest value is
 * always the one applied.
 */
export const SHAPING_APPLY_INTERVAL_MS = 120;

type PlaybackShapingSessionOptions = {
  minApplyIntervalMs?: number;
  scheduler?: RunnerScheduler;
};

/**
 * The ambient shaping of the playback session (design Decision 6, task 5.3).
 *
 * Ambient settings live until the app restarts or the user resets them:
 * stopping or dismissing playback keeps them, a queue advance keeps them, and
 * only a new user-initiated start (`startNewPlayback`) returns to neutral.
 *
 * The engine is only given values that changed, one run at a time, newest
 * value last: a pitch tap does not rewrite the speed and a speed change does
 * not rewrite the pitch.
 */
export const createPlaybackShapingSession = (
  engine: PlaybackShapingEngine,
  options: PlaybackShapingSessionOptions = {},
): PlaybackShapingSession => {
  const listeners = new Set<() => void>();
  let ambient: ShapingAxes = NEUTRAL_AXES;
  let itemTransform: ItemShapingTransform | null = null;
  // The web player's media element does not exist before the first load, so
  // settings made earlier are only remembered and applied by that load.
  let hasLoadedItem = false;
  // What the engine was last given, so unchanged values are not rewritten.
  let appliedPitch: number | null = null;
  let appliedSpeed: number | null = null;
  let shouldRewriteAll = false;
  let state = buildState();

  function buildState(): PlaybackShapingSessionState {
    return {
      ambient,
      canShapePitch: engine.canShapePitch,
      effective: itemTransform ?? ambient,
      isItemTransformActive: itemTransform !== null,
    };
  }

  const publish = () => {
    state = buildState();
    listeners.forEach((listener) => listener());
  };

  // Reads the effective shaping when it runs, so a run that was delayed by the
  // interval applies the latest value rather than the one that scheduled it.
  // A failure leaves the ambient value recorded and the applied marker
  // untouched, so the next run retries it.
  const applyChanges = async () => {
    if (!hasLoadedItem) {
      return;
    }

    const effective = itemTransform ?? ambient;
    const shouldRewrite = shouldRewriteAll;

    shouldRewriteAll = false;

    if (shouldRewrite || appliedSpeed !== effective.speedMultiplier) {
      await engine.setSpeedMultiplier(effective.speedMultiplier);
      appliedSpeed = effective.speedMultiplier;
    }

    if (shouldRewrite || appliedPitch !== effective.pitchSemitones) {
      await engine.setPitchSemitones(effective.pitchSemitones);
      appliedPitch = effective.pitchSemitones;
    }
  };

  const runner = createCoalescedRunner(applyChanges, {
    minIntervalMs: options.minApplyIntervalMs ?? SHAPING_APPLY_INTERVAL_MS,
    scheduler: options.scheduler,
  });

  return {
    getState: () => state,
    applyForLoadedItem: (nextItemTransform = null) => {
      hasLoadedItem = true;
      itemTransform = nextItemTransform;
      shouldRewriteAll = true;
      publish();

      return runner.runNow();
    },
    startNewPlayback: () => {
      ambient = NEUTRAL_AXES;
      itemTransform = null;
      publish();
    },
    reset: () => {
      ambient = NEUTRAL_AXES;
      publish();

      return runner.runNow();
    },
    setPitchSemitones: (semitones) => {
      // Where pitch cannot be shifted the ambient value stays 0, so no surface
      // reports a pitch change nobody can hear (see `canShapePitchOnPlatform`).
      const pitchSemitones = engine.canShapePitch
        ? clampPitchSemitones(semitones)
        : NEUTRAL_AXES.pitchSemitones;

      ambient = { ...ambient, pitchSemitones };
      publish();

      return runner.request();
    },
    setSpeedMultiplier: (multiplier) => {
      ambient = {
        ...ambient,
        speedMultiplier: clampSpeedMultiplier(multiplier),
      };
      publish();

      return runner.request();
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};
