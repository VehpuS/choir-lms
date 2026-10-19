import { musicXmlPitchToMidi, type MusicXmlTranspose } from './piano-pitch.ts';

/** The lowest and highest sounding MIDI notes in a part. */
export type ScoreNoteRange = { lowest: number; highest: number };

const PART_BLOCK_PATTERN = /<part\b[^>]*>([\s\S]*?)<\/part>/g;
// Walks a part in order, so a `<transpose>` applies to the notes after it.
const TRANSPOSE_OR_NOTE_PATTERN =
  /<transpose\b[^>]*>([\s\S]*?)<\/transpose>|<note\b[^>]*>([\s\S]*?)<\/note>/g;
const PITCH_PATTERN = /<pitch\b[^>]*>([\s\S]*?)<\/pitch>/;
const STEP_PATTERN = /<step\b[^>]*>\s*([A-G])\s*<\/step>/;
const ALTER_PATTERN = /<alter\b[^>]*>\s*(-?\d+(?:\.\d+)?)\s*<\/alter>/;
const OCTAVE_PATTERN = /<octave\b[^>]*>\s*(-?\d+)\s*<\/octave>/;
const CHROMATIC_PATTERN = /<chromatic\b[^>]*>\s*(-?\d+)\s*<\/chromatic>/;
const OCTAVE_CHANGE_PATTERN =
  /<octave-change\b[^>]*>\s*(-?\d+)\s*<\/octave-change>/;
const COMMENT_PATTERN = /<!--[\s\S]*?-->/g;

const readInteger = (text: string, pattern: RegExp): number | undefined => {
  const value = pattern.exec(text)?.[1];

  return value === undefined ? undefined : Number.parseInt(value, 10);
};

const readTranspose = (body: string): MusicXmlTranspose => ({
  chromatic: readInteger(body, CHROMATIC_PATTERN),
  octaveChange: readInteger(body, OCTAVE_CHANGE_PATTERN),
});

/** A written pitch element's sounding MIDI number, or undefined (a rest). */
const readNoteMidi = (
  noteBody: string,
  transpose: MusicXmlTranspose,
): number | undefined => {
  const pitch = PITCH_PATTERN.exec(noteBody)?.[1];
  const step = pitch ? STEP_PATTERN.exec(pitch)?.[1] : undefined;
  const octave = pitch ? readInteger(pitch, OCTAVE_PATTERN) : undefined;

  if (!pitch || !step || octave === undefined) {
    return undefined;
  }

  const alterText = ALTER_PATTERN.exec(pitch)?.[1];
  const alter = alterText === undefined ? 0 : Math.round(Number(alterText));

  return musicXmlPitchToMidi({ step, alter, octave }, transpose) ?? undefined;
};

/**
 * The note range of each part, in part order, as it sounds: written pitch plus
 * the part's `<transpose>`. A part with no pitched notes (all rests, or
 * unpitched percussion) gets `null`. Takes the MusicXML text; a compressed
 * `.mxl` must be unzipped by the caller.
 */
export const extractPartNoteRanges = (
  musicXml: string,
): (ScoreNoteRange | null)[] => {
  const cleaned = musicXml.replace(COMMENT_PATTERN, '');

  return [...cleaned.matchAll(PART_BLOCK_PATTERN)].map((part) => {
    let transpose: MusicXmlTranspose = {};
    let range: ScoreNoteRange | null = null;

    for (const match of (part[1] ?? '').matchAll(TRANSPOSE_OR_NOTE_PATTERN)) {
      if (match[1] !== undefined) {
        transpose = readTranspose(match[1]);
        continue;
      }

      const midi = readNoteMidi(match[2] ?? '', transpose);

      if (midi === undefined) {
        continue;
      }

      range = range
        ? {
            lowest: Math.min(range.lowest, midi),
            highest: Math.max(range.highest, midi),
          }
        : { lowest: midi, highest: midi };
    }

    return range;
  });
};

/** The union of some parts' ranges, or `null` when none has a pitched note. */
export const combineNoteRanges = (
  ranges: readonly (ScoreNoteRange | null)[],
): ScoreNoteRange | null => {
  return ranges.reduce<ScoreNoteRange | null>((combined, range) => {
    if (!range) {
      return combined;
    }

    return combined
      ? {
          lowest: Math.min(combined.lowest, range.lowest),
          highest: Math.max(combined.highest, range.highest),
        }
      : range;
  }, null);
};

/**
 * The `<transpose>` each part declares, in part order (the first one found in
 * the part); `{}` when a part has none, as vocal parts normally do.
 */
export const extractPartTransposes = (
  musicXml: string,
): MusicXmlTranspose[] => {
  const cleaned = musicXml.replace(COMMENT_PATTERN, '');

  return [...cleaned.matchAll(PART_BLOCK_PATTERN)].map((part) => {
    for (const match of (part[1] ?? '').matchAll(TRANSPOSE_OR_NOTE_PATTERN)) {
      if (match[1] !== undefined) {
        return readTranspose(match[1]);
      }
    }

    return {};
  });
};
