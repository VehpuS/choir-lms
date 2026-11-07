import type {
  CompositeEngine,
  CompositeEngineState,
} from '../engine/composite-engine';

/**
 * The composite that is playing now, if any (composite-tracks design Decision
 * 5). The player wrapper and the playback hooks read it: while an engine is
 * active it is the player, otherwise the media element's player is. Setting a
 * new engine, or clearing, disposes the previous one, so a track loading after
 * a composite releases its audio graph.
 */

type Listener = () => void;

let active: CompositeEngine | null = null;
let stopWatching: (() => void) | null = null;
const changeListeners = new Set<Listener>();
const endedListeners = new Set<Listener>();

export const getActiveCompositeEngine = (): CompositeEngine | null => active;

export const subscribeActiveCompositeEngine = (listener: Listener) => {
  changeListeners.add(listener);

  return () => {
    changeListeners.delete(listener);
  };
};

/** Called each time the active composite plays to its end (the queue moves on). */
export const subscribeCompositeEnded = (listener: Listener) => {
  endedListeners.add(listener);

  return () => {
    endedListeners.delete(listener);
  };
};

const watchForEnd = (engine: CompositeEngine) => {
  let previous: CompositeEngineState = engine.getState();

  return engine.subscribe(() => {
    const current = engine.getState();

    if (current === 'ended' && previous !== 'ended') {
      endedListeners.forEach((listener) => listener());
    }

    previous = current;
  });
};

export const setActiveCompositeEngine = (engine: CompositeEngine | null) => {
  if (engine === active) {
    return;
  }

  stopWatching?.();
  stopWatching = null;
  active?.dispose();
  active = engine;

  if (engine) {
    stopWatching = watchForEnd(engine);
  }

  changeListeners.forEach((listener) => listener());
};

export const clearActiveCompositeEngine = () => setActiveCompositeEngine(null);
