import type {
  CompositeEngine,
  CompositeEngineState,
} from '../engine/composite-engine';

/**
 * The engine that is playing now, if any (composite-tracks design Decision 5).
 * The player wrapper and the playback hooks read it: while an engine is active
 * it is the player, otherwise the media element's player is. Setting a new
 * engine, or clearing, disposes the previous one, so a track loading after a
 * composite releases its audio graph.
 *
 * The engine plays a composite, or a single track while a microphone is open
 * (clear-playback-while-listening design Decision 2). The transport does not
 * care which; composite-only surfaces ask for the kind.
 */

export type ActiveEngineKind = 'composite' | 'track';

type Listener = () => void;

let active: CompositeEngine | null = null;
let activeKind: ActiveEngineKind | null = null;
let stopWatching: (() => void) | null = null;
const changeListeners = new Set<Listener>();
const endedListeners = new Set<Listener>();

export const getActiveCompositeEngine = (): CompositeEngine | null => active;

/** What the active engine plays, or null without one. */
export const getActiveEngineKind = (): ActiveEngineKind | null => activeKind;

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

export const setActiveCompositeEngine = (
  engine: CompositeEngine | null,
  kind: ActiveEngineKind = 'composite',
) => {
  const nextKind = engine ? kind : null;

  if (engine === active && nextKind === activeKind) {
    return;
  }

  if (engine === active) {
    // The same engine under another kind: nothing to dispose or watch again.
    activeKind = nextKind;
    changeListeners.forEach((listener) => listener());

    return;
  }

  stopWatching?.();
  stopWatching = null;
  active?.dispose();
  active = engine;
  activeKind = nextKind;

  if (engine) {
    stopWatching = watchForEnd(engine);
  }

  changeListeners.forEach((listener) => listener());
};

export const clearActiveCompositeEngine = () => setActiveCompositeEngine(null);
