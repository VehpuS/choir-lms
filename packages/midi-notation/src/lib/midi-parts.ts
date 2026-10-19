import { classifyVocalPart, type ScorePart } from '@org/audio-library-models';

import {
  PERCUSSION_CHANNEL_INDEX,
  readMidiFile,
  resolveTrackName,
} from './tone-midi.ts';

// Deliberately not re-exported from the package index: that would put
// `@tonejs/midi` in the app's startup bundle. The viewer loads it lazily
// through the `@org/midi-notation` package.
/**
 * Lists the parts of a Standard MIDI File: one per track that holds notes
 * (tempo and conductor tracks are skipped). Takes the file bytes and never
 * throws; bytes that are not a MIDI file give an empty list.
 *
 * A part's id is its position in the parser's track list (which can omit a
 * tempo-only first track), so it is stable for a given file; a saved choice
 * also keeps the part name and index. Only the track name and a General MIDI choir or voice program count
 * as vocal evidence: files default every track to the piano program, so the
 * program name is not used and an unnamed track is `unknown`, not hidden.
 */
export const extractMidiParts = (bytes: ArrayLike<number>): ScorePart[] => {
  const midi = readMidiFile(bytes);

  if (!midi) {
    return [];
  }

  const parts: ScorePart[] = [];

  midi.tracks.forEach((track, trackIndex) => {
    if (track.notes.length === 0) {
      return;
    }

    const index = parts.length;
    const name = resolveTrackName(midi.tracks, trackIndex);
    const midiProgram = track.instrument.number + 1;
    const isPercussion = track.channel === PERCUSSION_CHANNEL_INDEX;

    parts.push({
      id: `track-${trackIndex}`,
      index,
      name: name.length > 0 ? name : `Track ${trackIndex + 1}`,
      midiProgram,
      channel: track.channel + 1,
      // A drum channel is instrumental unless the track says it is sung (a
      // beatbox part), so the name is asked first.
      kind: (() => {
        const byName = classifyVocalPart({ name, midiProgram });

        return isPercussion && byName !== 'vocal' ? 'instrumental' : byName;
      })(),
    });
  });

  return parts;
};
