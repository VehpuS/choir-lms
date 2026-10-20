import { useEffect, useSyncExternalStore } from 'react';

import { pianoCapabilities } from './piano-capabilities';
import { getPianoPreferences } from './piano-preferences';
import { loadPianoSample } from './piano-sample-sources';
import {
  createPianoSoundEngine,
  type PianoSoundEngine,
} from './piano-sound-engine';
import type { AudioContextLike } from './web-audio-types';

// The app's TypeScript config carries no DOM library, so the browser
// constructor is described structurally.
type WebScope = { AudioContext?: new () => AudioContextLike };

const createWebContext = (): AudioContextLike | null => {
  const AudioContextConstructor = (globalThis as unknown as WebScope)
    .AudioContext;

  return pianoCapabilities().canPlay && AudioContextConstructor
    ? new AudioContextConstructor()
    : null;
};

let sharedEngine: PianoSoundEngine | null = null;
let consumers = 0;

const acquireEngine = (): PianoSoundEngine => {
  sharedEngine ??= createPianoSoundEngine({
    createContext: createWebContext,
    loadSample: loadPianoSample,
    getSettings: () => {
      const { sound, volume } = getPianoPreferences();

      return { sound, volume };
    },
  });

  return sharedEngine;
};

const NO_NOTES: ReadonlySet<number> = new Set();

// The events browsers accept as a user gesture for starting audio. A touch
// `pointerdown` is not one (Safari and touch Chrome want the lift), which is
// why a context started only from a key's `pointerdown` can stay silent until
// something else has played audio on the page.
const UNLOCK_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const;

type UnlockTarget = {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
};

export type PianoSound = {
  press: (midi: number) => void;
  release: (midi: number) => void;
  /** Creates and resumes the audio context; call from a user gesture. */
  prime: () => void;
  /** Keys sounding now, from the keyboard or from tapped notes. */
  sounding: ReadonlySet<number>;
};

/**
 * One piano shared by the shell's overlay, the viewer's docked overlay, and
 * score note taps. The audio context is created at the first gesture and
 * closed when the last consumer unmounts.
 */
export const usePianoSound = (): PianoSound => {
  const engine = acquireEngine();
  const sounding = useSyncExternalStore(
    engine.subscribe,
    engine.getSounding,
    () => NO_NOTES,
  );

  // Any qualifying gesture while the piano is in use starts the audio context,
  // so it is already running by the time a key is played.
  useEffect(() => {
    const target = (globalThis as unknown as { document?: UnlockTarget })
      .document;
    const unlock = () => {
      engine.prime();
    };

    UNLOCK_EVENTS.forEach((type) => {
      target?.addEventListener(type, unlock);
    });
    unlock();

    return () => {
      UNLOCK_EVENTS.forEach((type) => {
        target?.removeEventListener(type, unlock);
      });
    };
  }, [engine]);

  useEffect(() => {
    consumers += 1;

    return () => {
      consumers -= 1;

      if (consumers === 0) {
        // Dispose but keep the engine: it recreates its context on the next
        // press, and StrictMode runs this cleanup right after mounting.
        sharedEngine?.dispose();
      }
    };
  }, []);

  return {
    press: (midi) => engine.press(midi),
    release: engine.release,
    prime: engine.prime,
    sounding,
  };
};
