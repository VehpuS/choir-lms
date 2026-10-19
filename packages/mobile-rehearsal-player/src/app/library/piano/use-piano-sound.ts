import { useEffect, useSyncExternalStore } from 'react';

import { pianoCapabilities } from './piano-capabilities';
import { getPianoPreferences } from './piano-preferences';
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
    getSettings: () => {
      const { sound, volume } = getPianoPreferences();

      return { sound, volume };
    },
  });

  return sharedEngine;
};

const NO_NOTES: ReadonlySet<number> = new Set();

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
