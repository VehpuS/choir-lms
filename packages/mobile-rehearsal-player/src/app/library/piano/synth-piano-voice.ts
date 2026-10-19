import { midiToFrequency } from '@org/audio-library-models';

import type { PianoNoteHandle, PianoVoice } from './piano-voice';
import type { AudioContextLike } from './web-audio-types';

const ATTACK_SECONDS = 0.005;
const RELEASE_SECONDS = 0.25;
const STOP_MARGIN_SECONDS = 0.05;
const NOTE_LEVEL = 0.28;
/** Floor for exponential ramps, which cannot reach exactly zero. */
const SILENCE = 0.0001;
const PARTIAL_COUNT = 6;
/**
 * Piano strings are slightly stiff, so upper partials sit a little above exact
 * multiples; this stretch is what makes a stack of sines read as a piano
 * rather than an organ.
 */
const INHARMONICITY = 0.0004;
const PARTIAL_LEVEL_ROLLOFF = 1.15;
/** Higher partials die away faster than the fundamental. */
const PARTIAL_DECAY_ROLLOFF = 0.75;
const MIDDLE_C_MIDI = 60;
const DECAY_HALVES_PER_SEMITONES = 24;
const MIN_DECAY_SECONDS = 1.5;
const MAX_DECAY_SECONDS = 14;
const MIDDLE_C_DECAY_SECONDS = 6;

/** Low strings ring longer than high ones. */
const fundamentalDecaySeconds = (midi: number) => {
  const decay =
    MIDDLE_C_DECAY_SECONDS *
    2 ** ((MIDDLE_C_MIDI - midi) / DECAY_HALVES_PER_SEMITONES);

  return Math.min(Math.max(decay, MIN_DECAY_SECONDS), MAX_DECAY_SECONDS);
};

/**
 * The default `Piano` sound: a decaying stack of partials with piano-like
 * inharmonicity. It stands in for sampled audio (design Decision 4's
 * fallback, task 1.1) behind the same `PianoVoice` interface, so recorded
 * samples can replace it without touching the keyboard or the score taps.
 */
export const createSynthPianoVoice = (
  context: AudioContextLike,
): PianoVoice => {
  const master = context.createGain();
  const live = new Set<() => void>();

  master.gain.value = 1;
  master.connect(context.destination);

  const noteOn = (midi: number, velocity: number): PianoNoteHandle => {
    const now = context.currentTime;
    const fundamental = midiToFrequency(midi);
    const envelope = context.createGain();
    const baseDecay = fundamentalDecaySeconds(midi);
    const oscillators = Array.from({ length: PARTIAL_COUNT }, (_, index) => {
      const multiple = index + 1;
      const oscillator = context.createOscillator();
      const partial = context.createGain();
      const level = 1 / multiple ** PARTIAL_LEVEL_ROLLOFF;

      oscillator.type = 'sine';
      oscillator.frequency.value =
        fundamental * multiple * Math.sqrt(1 + INHARMONICITY * multiple ** 2);
      partial.gain.setValueAtTime(level, now);
      partial.gain.exponentialRampToValueAtTime(
        SILENCE,
        now + baseDecay / multiple ** PARTIAL_DECAY_ROLLOFF,
      );
      oscillator.connect(partial);
      partial.connect(envelope);
      oscillator.start(now);

      return oscillator;
    });

    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(
      NOTE_LEVEL * velocity,
      now + ATTACK_SECONDS,
    );
    envelope.connect(master);

    let released = false;
    const release = () => {
      if (released) {
        return;
      }

      released = true;
      live.delete(release);

      const at = context.currentTime;

      envelope.gain.cancelScheduledValues(at);
      envelope.gain.setValueAtTime(Math.max(envelope.gain.value, SILENCE), at);
      envelope.gain.exponentialRampToValueAtTime(SILENCE, at + RELEASE_SECONDS);
      oscillators.forEach((oscillator, index) => {
        oscillator.stop(at + RELEASE_SECONDS + STOP_MARGIN_SECONDS);

        if (index === 0) {
          oscillator.onended = () => {
            envelope.disconnect();
          };
        }
      });
    };

    live.add(release);

    return { release };
  };

  return {
    load: async () => undefined,
    noteOn,
    setVolume: (volume) => {
      master.gain.value = volume;
    },
    dispose: () => {
      [...live].forEach((release) => {
        release();
      });
      master.disconnect();
    },
  };
};
