import { createOrganVoice } from './organ-voice';
import type { PianoSound } from './piano-preferences';
import type { PianoNoteHandle, PianoVoice } from './piano-voice';
import { createSynthPianoVoice } from './synth-piano-voice';
import type { AudioContextLike } from './web-audio-types';

export type PianoSoundEngineOptions = {
  /** Returns null where the platform cannot play (native, no Web Audio). */
  createContext: () => AudioContextLike | null;
  /** Read at each press so Settings and the volume control apply at once. */
  getSettings: () => { sound: PianoSound; volume: number };
};

export type PianoSoundEngine = {
  press: (midi: number, velocity?: number) => void;
  release: (midi: number) => void;
  /** Creates and resumes the context; call from a user gesture. */
  prime: () => void;
  /** The keys sounding now; a new set each time it changes. */
  getSounding: () => ReadonlySet<number>;
  subscribe: (listener: () => void) => () => void;
  dispose: () => void;
};

const DEFAULT_VELOCITY = 0.8;
const NO_NOTES: ReadonlySet<number> = new Set();

const VOICE_FACTORIES: Record<
  PianoSound,
  (context: AudioContextLike) => PianoVoice
> = {
  piano: createSynthPianoVoice,
  organ: createOrganVoice,
};

/**
 * Owns the piano's own audio context (separate from playback shaping, so the
 * track is never touched) and the notes sounding on it. The keyboard and the
 * score both press through one engine so each can light the other's keys.
 */
export const createPianoSoundEngine = (
  options: PianoSoundEngineOptions,
): PianoSoundEngine => {
  let context: AudioContextLike | null = null;
  const voices = new Map<PianoSound, PianoVoice>();
  const notes = new Map<number, PianoNoteHandle>();
  let sounding: ReadonlySet<number> = NO_NOTES;
  const listeners = new Set<() => void>();

  const publish = () => {
    sounding = new Set(notes.keys());
    listeners.forEach((listener) => {
      listener();
    });
  };

  const ensureContext = () => {
    context ??= options.createContext();

    if (context && context.state !== 'running') {
      // Browsers keep the context suspended until a user gesture.
      void context.resume();
    }

    return context;
  };

  const voiceFor = (sound: PianoSound, audio: AudioContextLike) => {
    let voice = voices.get(sound);

    if (!voice) {
      voice = VOICE_FACTORIES[sound](audio);
      voices.set(sound, voice);
    }

    return voice;
  };

  return {
    press: (midi, velocity = DEFAULT_VELOCITY) => {
      const audio = ensureContext();

      if (!audio || notes.has(midi)) {
        return;
      }

      const { sound, volume } = options.getSettings();
      const voice = voiceFor(sound, audio);

      voice.setVolume(volume);
      notes.set(midi, voice.noteOn(midi, velocity));
      publish();
    },
    release: (midi) => {
      const note = notes.get(midi);

      if (!note) {
        return;
      }

      note.release();
      notes.delete(midi);
      publish();
    },
    prime: () => {
      ensureContext();
    },
    getSounding: () => sounding,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    dispose: () => {
      notes.clear();
      voices.forEach((voice) => {
        voice.dispose();
      });
      voices.clear();
      void context?.close();
      context = null;
      publish();
    },
  };
};
