import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import type {
  CompositeEngine,
  CompositeEngineState,
} from '../engine/composite-engine';
import {
  getActiveCompositeEngine,
  subscribeActiveCompositeEngine,
  subscribeCompositeEnded,
} from './active-composite';
import {
  toPlayerProgress,
  toPlayerState,
  type PlayerStateMap,
} from './composite-aware-player';

/**
 * Hook halves of the player seam: the playback hooks in the player interop
 * call these next to the media element's own hooks and prefer the composite's
 * values while an engine is active.
 */

export const useActiveCompositeEngine = (): CompositeEngine | null => {
  return useSyncExternalStore(
    subscribeActiveCompositeEngine,
    getActiveCompositeEngine,
    getActiveCompositeEngine,
  );
};

/** The engine's state, or undefined without an engine; follows its changes. */
export const useCompositeEngineState = (
  engine: CompositeEngine | null,
): CompositeEngineState | undefined => {
  const [, bump] = useState(0);

  useEffect(() => {
    return engine?.subscribe(() => bump((count) => count + 1));
  }, [engine]);

  return engine?.getState();
};

export type CompositeProgress = ReturnType<typeof toPlayerProgress>;

/** Position, duration and buffered in seconds, refreshed on an interval and on seeks. */
export const useCompositeProgress = (
  engine: CompositeEngine | null,
  updateIntervalMs: number,
): CompositeProgress | undefined => {
  const [progress, setProgress] = useState<CompositeProgress | undefined>();

  useEffect(() => {
    if (!engine) {
      setProgress(undefined);

      return undefined;
    }

    const refresh = () => setProgress(toPlayerProgress(engine));
    const handle = setInterval(refresh, updateIntervalMs);
    const unsubscribe = engine.subscribe(refresh);

    refresh();

    return () => {
      clearInterval(handle);
      unsubscribe();
    };
  }, [engine, updateIntervalMs]);

  return engine ? (progress ?? toPlayerProgress(engine)) : undefined;
};

/** Calls the handler each time the active composite plays to its end. */
export const useCompositeEnded = (handler: () => void) => {
  useEffect(() => subscribeCompositeEnded(handler), [handler]);
};

/** The active composite's state as the player library reports it, or undefined without one. */
export const useCompositePlaybackState = <State extends PlayerStateMap>(
  states: State,
) => {
  const engineState = useCompositeEngineState(useActiveCompositeEngine());

  return engineState
    ? { state: toPlayerState(engineState, states) }
    : undefined;
};

/** The composite playing to its end is the end of the queue, as a track is. */
export const useCompositeQueueEnded = (
  eventTypes: readonly string[],
  queueEndedType: string,
  handler: (event: { type: string }) => void,
) => {
  const listensForEnd = eventTypes.includes(queueEndedType);

  useCompositeEnded(
    useCallback(() => {
      if (listensForEnd) {
        handler({ type: queueEndedType });
      }
    }, [handler, listensForEnd, queueEndedType]),
  );
};
