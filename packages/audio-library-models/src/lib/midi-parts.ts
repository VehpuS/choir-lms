import * as toneMidi from '@tonejs/midi';

import { classifyVocalPart, type ScorePart } from './score-parts.ts';

type MidiClass = typeof toneMidi.Midi;

// `@tonejs/midi` ships a CommonJS build as `main`. Node's ESM loader exposes
// it only as `default`, while Metro's interop exposes the named export, so
// read the class from whichever the runtime provides.
const Midi: MidiClass =
  toneMidi.Midi ??
  (toneMidi as unknown as { default: { Midi: MidiClass } }).default.Midi;

// MIDI channel 10 (index 9) is reserved for percussion by General MIDI.
const PERCUSSION_CHANNEL_INDEX = 9;

// Deliberately not re-exported from the package index: that would put
// `@tonejs/midi` in the app's startup bundle. The first consumer (the viewer,
// 12.4/12.5) loads it lazily through its own subpath export.
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
  let midi: InstanceType<MidiClass>;

  try {
    midi = new Midi(bytes as ArrayLike<number> & ArrayBuffer);
  } catch {
    return [];
  }

  const parts: ScorePart[] = [];

  midi.tracks.forEach((track, trackIndex) => {
    if (track.notes.length === 0) {
      return;
    }

    const index = parts.length;
    const name = track.name.trim();
    const midiProgram = track.instrument.number + 1;
    const isPercussion = track.channel === PERCUSSION_CHANNEL_INDEX;

    parts.push({
      id: `track-${trackIndex}`,
      index,
      name: name.length > 0 ? name : `Track ${trackIndex + 1}`,
      midiProgram,
      channel: track.channel + 1,
      kind: isPercussion
        ? 'instrumental'
        : classifyVocalPart({ name, midiProgram }),
    });
  });

  return parts;
};
