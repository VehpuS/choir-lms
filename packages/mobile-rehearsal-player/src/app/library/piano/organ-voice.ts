import { midiToFrequency } from '@org/audio-library-models';

import type { PianoNoteHandle, PianoVoice } from './piano-voice';
import type { AudioContextLike, GainNodeLike } from './web-audio-types';

const ATTACK_SECONDS = 0.02;
const RELEASE_SECONDS = 0.12;
/** Headroom so ten notes at full volume do not clip the output. */
const NOTE_LEVEL = 0.22;
/** A sine fundamental plus two quiet harmonics: [multiple, relative level]. */
const PARTIALS: readonly (readonly [number, number])[] = [
  [1, 1],
  [2, 0.25],
  [3, 0.12],
];
const STOP_MARGIN_SECONDS = 0.05;

/** The simple oscillator `Organ` sound; needs no assets. */
export const createOrganVoice = (context: AudioContextLike): PianoVoice => {
  const master = context.createGain();
  const live = new Set<() => void>();

  master.gain.value = 1;
  master.connect(context.destination);

  const noteOn = (midi: number, velocity: number): PianoNoteHandle => {
    const now = context.currentTime;
    const envelope: GainNodeLike = context.createGain();
    const oscillators = PARTIALS.map(([multiple, level]) => {
      const oscillator = context.createOscillator();
      const partial = context.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = midiToFrequency(midi) * multiple;
      partial.gain.value = level;
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
      envelope.gain.setValueAtTime(envelope.gain.value, at);
      envelope.gain.linearRampToValueAtTime(0, at + RELEASE_SECONDS);
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
