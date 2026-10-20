import { createOrganVoice } from './organ-voice';
import type { PianoSound } from './piano-preferences';
import type { PianoNoteHandle, PianoVoice } from './piano-voice';
import { createSampledPianoVoice } from './sampled-piano-voice';
import type { AudioContextLike } from './web-audio-types';

export type PianoSoundEngineOptions = {
  /** Returns null where the platform cannot play (native, no Web Audio). */
  createContext: () => AudioContextLike | null;
  /** Read at each press so Settings and the volume control apply at once. */
  getSettings: () => { sound: PianoSound; volume: number };
  /** Fetches one recorded piano note as encoded audio. */
  loadSample: (midi: number) => Promise<ArrayBuffer>;
  /** Called once if the recordings fail; the piano then plays as the organ. */
  onSamplesUnavailable?: () => void;
};

export type PianoSoundEngine = {
  press: (midi: number, velocity?: number) => void;
  release: (midi: number) => void;
  /**
   * Creates the context if needed and tries to start it. Call it from any
   * user gesture: browsers only let audio start from certain events (a touch
   * `pointerdown` is not one; `pointerup`, `touchend`, `click`, and `keydown`
   * are), so the engine cannot rely on the key press itself to unlock audio.
   */
  prime: () => void;
  /** The keys pressed or sounding now; a new set each time it changes. */
  getSounding: () => ReadonlySet<number>;
  subscribe: (listener: () => void) => () => void;
  dispose: () => void;
};

/**
 * A key tapped while the context was still starting sounds at least this
 * long once it does, so a tap that beat the unlock is still heard.
 */
const MIN_DELAYED_NOTE_MS = 200;
/** A tap older than this when audio finally starts is dropped, not played late. */
const STALE_TAP_MS = 1000;
const DEFAULT_VELOCITY = 0.8;
const NO_NOTES: ReadonlySet<number> = new Set();

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
  /** Presses made before the context was running, and whether they ended. */
  const waiting = new Map<
    number,
    { velocity: number; isReleased: boolean; pressedAt: number }
  >();
  let sounding: ReadonlySet<number> = NO_NOTES;
  const listeners = new Set<() => void>();

  const publish = () => {
    // A press that already ended is not shown as held, even if it never starts.
    const held = [...waiting].filter(([, press]) => !press.isReleased);

    sounding = new Set([...notes.keys(), ...held.map(([midi]) => midi)]);
    listeners.forEach((listener) => {
      listener();
    });
  };

  const createVoice = (sound: PianoSound, audio: AudioContextLike) =>
    sound === 'organ'
      ? createOrganVoice(audio)
      : createSampledPianoVoice(audio, {
          fallback: createOrganVoice(audio),
          loadSample: options.loadSample,
          onLoadFailed: options.onSamplesUnavailable,
        });

  const voiceFor = (sound: PianoSound, audio: AudioContextLike) => {
    let voice = voices.get(sound);

    if (!voice) {
      voice = createVoice(sound, audio);
      voices.set(sound, voice);
      // The recordings load at the first use; presses meanwhile are queued by
      // the voice itself.
      void voice.load();
    }

    return voice;
  };

  const startNote = (
    midi: number,
    velocity: number,
    audio: AudioContextLike,
  ) => {
    const { sound, volume } = options.getSettings();
    const voice = voiceFor(sound, audio);

    voice.setVolume(volume);
    notes.set(midi, voice.noteOn(midi, velocity));
  };

  const stopNote = (midi: number) => {
    const note = notes.get(midi);

    if (note) {
      note.release();
      notes.delete(midi);
    }
  };

  // Sounds the presses that were waiting for the context to start.
  const flushWaiting = () => {
    if (!context || context.state !== 'running' || waiting.size === 0) {
      return;
    }

    for (const [midi, press] of [...waiting]) {
      waiting.delete(midi);

      if (press.isReleased && Date.now() - press.pressedAt > STALE_TAP_MS) {
        continue;
      }

      startNote(midi, press.velocity, context);

      if (press.isReleased) {
        setTimeout(() => {
          stopNote(midi);
          publish();
        }, MIN_DELAYED_NOTE_MS);
      }
    }

    publish();
  };

  const ensureContext = () => {
    context ??= options.createContext();

    return context;
  };

  const startContext = (audio: AudioContextLike) => {
    if (audio.state !== 'running') {
      // The promise settles when the browser allows audio, which may be at a
      // later gesture; `flushWaiting` then plays whatever was pressed.
      audio.resume().then(flushWaiting, () => undefined);
    }
  };

  return {
    press: (midi, velocity = DEFAULT_VELOCITY) => {
      const audio = ensureContext();

      if (!audio || notes.has(midi) || waiting.has(midi)) {
        return;
      }

      if (audio.state === 'running') {
        startNote(midi, velocity, audio);
      } else {
        // Scheduling on a context that is not running puts the note on a
        // frozen clock, and its release would fade it before it was heard.
        const isFirstWaiting = waiting.size === 0;

        waiting.set(midi, {
          velocity,
          isReleased: false,
          pressedAt: Date.now(),
        });

        if (isFirstWaiting) {
          startContext(audio);
        }
      }

      publish();
    },
    release: (midi) => {
      const press = waiting.get(midi);

      if (press) {
        press.isReleased = true;
        publish();

        return;
      }

      if (notes.has(midi)) {
        stopNote(midi);
        publish();
      }
    },
    prime: () => {
      const audio = ensureContext();

      if (audio) {
        startContext(audio);
      }
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
      waiting.clear();
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
