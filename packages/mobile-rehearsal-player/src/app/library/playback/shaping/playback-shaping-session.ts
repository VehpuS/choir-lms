import {
  DEFAULT_PLAYBACK_SHAPING,
  clampPitchSemitones,
  clampSpeedMultiplier,
  type PlaybackShaping,
} from '@org/audio-library-models';

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
   * runs after every load, not only when the user changes a setting.
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
 * The ambient shaping of the playback session (design Decision 6, task 5.3).
 *
 * Ambient settings live until the app restarts or the user resets them:
 * stopping or dismissing playback keeps them, a queue advance keeps them, and
 * only a new user-initiated start (`startNewPlayback`) returns to neutral.
 */
export const createPlaybackShapingSession = (
  engine: PlaybackShapingEngine,
): PlaybackShapingSession => {
  const listeners = new Set<() => void>();
  let ambient: ShapingAxes = NEUTRAL_AXES;
  let itemTransform: ItemShapingTransform | null = null;
  // The web player's media element does not exist before the first load, so
  // settings made earlier are only remembered and applied by that load.
  let hasLoadedItem = false;
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

  // Callers see engine failures (for example a pitch processor that cannot
  // load) as thrown errors, but the ambient value is kept so a retry or the
  // next load applies it.
  const applyEffective = async () => {
    if (!hasLoadedItem) {
      return;
    }

    const effective = itemTransform ?? ambient;

    await engine.setSpeedMultiplier(effective.speedMultiplier);
    await engine.setPitchSemitones(effective.pitchSemitones);
  };

  return {
    getState: () => state,
    applyForLoadedItem: async (nextItemTransform = null) => {
      hasLoadedItem = true;
      itemTransform = nextItemTransform;
      publish();
      await applyEffective();
    },
    startNewPlayback: () => {
      ambient = NEUTRAL_AXES;
      itemTransform = null;
      publish();
    },
    reset: async () => {
      ambient = NEUTRAL_AXES;
      publish();
      await applyEffective();
    },
    setPitchSemitones: async (semitones) => {
      // Where pitch cannot be shifted the ambient value stays 0, so no surface
      // reports a pitch change nobody can hear (see `canShapePitchOnPlatform`).
      const pitchSemitones = engine.canShapePitch
        ? clampPitchSemitones(semitones)
        : NEUTRAL_AXES.pitchSemitones;

      ambient = { ...ambient, pitchSemitones };
      publish();
      await applyEffective();
    },
    setSpeedMultiplier: async (multiplier) => {
      ambient = {
        ...ambient,
        speedMultiplier: clampSpeedMultiplier(multiplier),
      };
      publish();
      await applyEffective();
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};
