import { NOTE_MIDI_ATTRIBUTE } from './score-note-tags';

const SEMITONES_PER_OCTAVE = 12;
const MIDI_LOWEST = 0;
const MIDI_HIGHEST = 127;
/** A real minus sign, so the offset reads like the playback screen's. */
const MINUS = '−';

export type ScoreMarks = {
  /** The noteheads (by tag) to mark strongly, or null when nothing is sung. */
  exactMidi: number | null;
  /** The same note in other octaves, marked softly; empty while the setting is off. */
  otherOctaveMidis: readonly number[];
};

export const NO_SCORE_MARKS: ScoreMarks = {
  exactMidi: null,
  otherOctaveMidis: [],
};

/**
 * Which written notes match the sung one. A track shifted by `pitchOffset`
 * semitones plays each written note that much higher, so the singer sings the
 * written pitch plus the offset: the tag to mark is the sung note minus it. A
 * note's tag is its sounding pitch with any part transposition already applied,
 * so a transposing part needs nothing more. The offset is zero for speed-only
 * changes, with nothing playing, and where the platform cannot shift pitch.
 */
export const getScoreMarks = ({
  sungMidi,
  pitchOffset,
  showOtherOctave,
}: {
  sungMidi: number | null;
  pitchOffset: number;
  showOtherOctave: boolean;
}): ScoreMarks => {
  if (sungMidi === null) {
    return NO_SCORE_MARKS;
  }

  const exactMidi = sungMidi - pitchOffset;

  if (exactMidi < MIDI_LOWEST || exactMidi > MIDI_HIGHEST) {
    return NO_SCORE_MARKS;
  }

  const otherOctaveMidis: number[] = [];

  if (showOtherOctave) {
    for (let midi = MIDI_LOWEST; midi <= MIDI_HIGHEST; midi += 1) {
      if (
        midi !== exactMidi &&
        (midi - exactMidi) % SEMITONES_PER_OCTAVE === 0
      ) {
        otherOctaveMidis.push(midi);
      }
    }
  }

  return { exactMidi, otherOctaveMidis };
};

export type MarkPaint = { fill: string; stroke?: string; strokeWidth?: number };

const declarations = ({ fill, stroke, strokeWidth }: MarkPaint) =>
  [
    `fill:${fill}`,
    stroke ? `stroke:${stroke}` : null,
    strokeWidth ? `stroke-width:${strokeWidth}` : null,
  ]
    .filter(Boolean)
    .join(';');

const selector = (midis: readonly number[]) =>
  midis.map((midi) => `[${NOTE_MIDI_ATTRIBUTE}="${midi}"] path`).join(',');

/**
 * One block of style text for all marks. The browser applies it to exactly the
 * noteheads that are drawn (a copied run keeps its tags), so a change of note
 * is one text write, however long the score. The soft rule comes first so the
 * strong one wins if both ever matched. Empty text clears every mark.
 */
export const buildMarkRules = (
  marks: ScoreMarks,
  paint: { exact: MarkPaint; soft: MarkPaint },
): string => {
  const rules: string[] = [];

  if (marks.otherOctaveMidis.length > 0) {
    rules.push(
      `${selector(marks.otherOctaveMidis)}{${declarations(paint.soft)}}`,
    );
  }

  if (marks.exactMidi !== null) {
    rules.push(`${selector([marks.exactMidi])}{${declarations(paint.exact)}}`);
  }

  return rules.join('\n');
};

/** `Following track pitch −2 st` while the track is shifted, otherwise nothing. */
export const getOffsetLabel = (pitchOffset: number): string | null => {
  if (pitchOffset === 0) {
    return null;
  }

  const sign = pitchOffset > 0 ? '+' : MINUS;

  return `Following track pitch ${sign}${Math.abs(pitchOffset)} st`;
};
