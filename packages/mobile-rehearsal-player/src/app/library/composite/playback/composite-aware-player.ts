import type {
  CompositeEngine,
  CompositeEngineState,
} from '../engine/composite-engine';
import {
  clearActiveCompositeEngine,
  getActiveCompositeEngine,
} from './active-composite';

/**
 * Wraps the media element's player so a composite can stand in for it
 * (composite-tracks design Decision 5). While an engine is active the transport
 * calls (`play`, `pause`, `seekTo`, volume, rate, progress and state) go to the
 * engine; everything else, and every call with no active engine, goes to the
 * wrapped player unchanged. `reset` also clears the engine and still resets the
 * wrapped player, so the media element and blob URLs of the previous track are
 * released when a composite loads.
 */

const MS_PER_SECOND = 1000;

/** The values of the player library's `State` enum that an engine maps onto. */
export type PlayerStateMap = {
  Ended: unknown;
  Paused: unknown;
  Playing: unknown;
};

export const toPlayerState = <State extends PlayerStateMap>(
  engineState: CompositeEngineState,
  states: State,
): State['Ended' | 'Paused' | 'Playing'] => {
  switch (engineState) {
    case 'playing':
      return states.Playing as never;
    case 'ended':
      return states.Ended as never;
    case 'paused':
      return states.Paused as never;
  }
};

/** Seconds, as the player library reports progress. */
export const toPlayerProgress = (engine: CompositeEngine) => {
  const duration = engine.durationMs / MS_PER_SECOND;

  return {
    position: engine.getPositionMs() / MS_PER_SECOND,
    duration,
    buffered: duration,
  };
};

type TransportOverrides<State extends PlayerStateMap> = (
  engine: CompositeEngine,
  base: object,
  states: State,
) => Record<string, (...args: never[]) => unknown>;

const createOverrides = <
  State extends PlayerStateMap,
>(): TransportOverrides<State> => {
  return (engine, _base, states) => ({
    play: async () => engine.play(),
    pause: async () => engine.pause(),
    stop: async () => {
      engine.pause();
      engine.seek(0);
    },
    seekTo: async (seconds: number) => engine.seek(seconds * MS_PER_SECOND),
    setVolume: async (volume: number) => engine.setVolume(volume),
    getVolume: async () => engine.getVolume(),
    setRate: async (rate: number) => engine.setRate(rate),
    getRate: async () => engine.getRate(),
    getProgress: async () => toPlayerProgress(engine),
    getPlaybackState: async () => ({
      state: toPlayerState(engine.getState(), states),
    }),
  });
};

export type CompositeAwarePlayerDependencies<State extends PlayerStateMap> = {
  getActiveEngine: () => CompositeEngine | null;
  clearActiveEngine: () => void;
  states: State;
};

export const createCompositeAwarePlayer = <
  Player extends object,
  State extends PlayerStateMap,
>(
  base: Player,
  dependencies: CompositeAwarePlayerDependencies<State>,
): Player => {
  const overrides = createOverrides<State>();

  return new Proxy(base, {
    get: (target, property, receiver) => {
      if (property === 'reset') {
        return async (...args: unknown[]) => {
          dependencies.clearActiveEngine();

          return (target as Record<string, (...a: unknown[]) => unknown>).reset(
            ...args,
          );
        };
      }

      const engine = dependencies.getActiveEngine();
      const override =
        engine && typeof property === 'string'
          ? overrides(engine, target, dependencies.states)[property]
          : undefined;

      if (override) {
        return override;
      }

      const value = Reflect.get(target, property, receiver);

      // Methods run against the wrapped player, not the proxy.
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
};

// One wrapper per wrapped player, so callers always get the same object.
const wrappedPlayers = new WeakMap<object, object>();

export const getCompositeAwarePlayer = <
  Player extends object,
  State extends PlayerStateMap,
>(
  base: Player,
  dependencies: CompositeAwarePlayerDependencies<State>,
): Player => {
  const existing = wrappedPlayers.get(base);

  if (existing) {
    return existing as Player;
  }

  const wrapped = createCompositeAwarePlayer(base, dependencies);

  wrappedPlayers.set(base, wrapped);

  return wrapped;
};

/** The wrapper wired to the app's active-composite registry. */
export const getAppCompositeAwarePlayer = <
  Player extends object,
  State extends PlayerStateMap,
>(
  base: Player,
  states: State,
): Player => {
  return getCompositeAwarePlayer(base, {
    getActiveEngine: getActiveCompositeEngine,
    clearActiveEngine: clearActiveCompositeEngine,
    states,
  });
};
