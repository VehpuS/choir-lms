import type { PlaybackPitchShifter } from '../../playback/shaping/playback-shaping-types';
import type { CompositeEngine } from '../engine/composite-engine';

/**
 * Pitch for the playback shaping engine while a composite plays (design
 * Decision 6). The media element pitch shifter belongs to the element, which a
 * composite does not use, so with an engine active the semitones go to the
 * engine's own pitch stage and the element shifter is left as it was. Speed
 * needs no counterpart: it reaches the engine through the composite-aware
 * player.
 */
export const wrapPitchShifterForComposite = (
  shifter: PlaybackPitchShifter | null,
  getActiveEngine: () => CompositeEngine | null,
): PlaybackPitchShifter | null => {
  if (!shifter) {
    return null;
  }

  return {
    setSemitones: async (semitones) => {
      const engine = getActiveEngine();

      if (engine) {
        engine.setPitchSemitones(semitones);

        return;
      }

      await shifter.setSemitones(semitones);
    },
  };
};
