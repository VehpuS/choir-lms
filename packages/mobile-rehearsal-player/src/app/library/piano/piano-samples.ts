/** C2, the lowest recorded sample. */
export const LOWEST_SAMPLE_MIDI = 36;
/** C7, the highest recorded sample. */
export const HIGHEST_SAMPLE_MIDI = 96;
/** The recordings are one every minor third. */
export const SAMPLE_SPACING_SEMITONES = 3;

const SEMITONES_PER_OCTAVE = 12;

/** The MIDI numbers that have a recording: C2, D♯2, F♯2, A2, C3, … C7. */
export const SAMPLE_MIDIS: readonly number[] = Array.from(
  {
    length:
      (HIGHEST_SAMPLE_MIDI - LOWEST_SAMPLE_MIDI) / SAMPLE_SPACING_SEMITONES + 1,
  },
  (_, index) => LOWEST_SAMPLE_MIDI + index * SAMPLE_SPACING_SEMITONES,
);

/**
 * The recording to play for a key, and the rate that moves it onto the key's
 * pitch. Keys between recordings shift by one semitone at most; keys beyond
 * either end shift further from the nearest edge sample.
 */
export const nearestSample = (
  midi: number,
): { playbackRate: number; sampleMidi: number } => {
  const index = Math.round(
    (midi - LOWEST_SAMPLE_MIDI) / SAMPLE_SPACING_SEMITONES,
  );
  const clamped = Math.min(Math.max(index, 0), SAMPLE_MIDIS.length - 1);
  const sampleMidi = SAMPLE_MIDIS[clamped] ?? LOWEST_SAMPLE_MIDI;

  return {
    playbackRate: 2 ** ((midi - sampleMidi) / SEMITONES_PER_OCTAVE),
    sampleMidi,
  };
};
