import {
  centsZone,
  midiToNoteName,
  type CentsZone,
} from '@org/audio-library-models';

import type { NoteSegment, PitchHistorySnapshot } from './pitch-history';

const MS_PER_SECOND = 1000;
const SEMITONES_PER_OCTAVE = 12;
/** The time zoom steps of the roll, about 5 to 60 seconds (design Decision 15). */
export const ROLL_ZOOM_SECONDS = [5, 10, 20, 30, 60] as const;
export const DEFAULT_ROLL_ZOOM_SECONDS = 10;
/** Semitones of room above and below the sung range. */
const ROLL_PADDING_SEMITONES = 2;
/** The roll always spans at least an octave so one note does not fill it. */
const MIN_ROLL_SPAN_SEMITONES = SEMITONES_PER_OCTAVE;
/** With nothing sung yet, the scale is centred on middle C. */
const EMPTY_ROLL_CENTRE_MIDI = 60;
/** A bar shows its note name only when at least this much of the window wide. */
const MIN_LABEL_WIDTH = 0.06;
const NATURAL_C_PITCH_CLASS = 0;

export type RollZoomSeconds = (typeof ROLL_ZOOM_SECONDS)[number];

export type RollRow = {
  midi: number;
  name: string;
  /** Octave rows (the Cs) are drawn stronger than the rest. */
  isOctave: boolean;
};

export type RollBar = {
  noteId: number;
  midi: number;
  name: string;
  /** 0 at the left edge of the window, 1 at the leading edge. */
  x0: number;
  x1: number;
  zone: CentsZone;
  isCurrent: boolean;
  showLabel: boolean;
};

export type RollModel = {
  windowSeconds: number;
  /** Highest note first, so rows read top to bottom. */
  rows: readonly RollRow[];
  bars: readonly RollBar[];
};

/** One step in or out, stopping at the ends (in is a shorter window). */
export const stepRollZoom = (
  current: number,
  direction: 'in' | 'out',
): RollZoomSeconds => {
  const index = ROLL_ZOOM_SECONDS.findIndex((step) => step >= current);
  const here = index === -1 ? ROLL_ZOOM_SECONDS.length - 1 : index;
  const next = direction === 'in' ? here - 1 : here + 1;
  const clamped = Math.min(Math.max(next, 0), ROLL_ZOOM_SECONDS.length - 1);

  return ROLL_ZOOM_SECONDS[clamped];
};

const toRow = (midi: number): RollRow => {
  return {
    midi,
    name: midiToNoteName(midi),
    isOctave:
      ((midi % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) %
        SEMITONES_PER_OCTAVE ===
      NATURAL_C_PITCH_CLASS,
  };
};

/** The scale, auto-centred on what is on screen and at least an octave tall. */
export const buildRollRows = (
  visibleMidis: readonly number[],
): readonly RollRow[] => {
  if (visibleMidis.length === 0) {
    const half = MIN_ROLL_SPAN_SEMITONES / 2;

    return buildRange(
      EMPTY_ROLL_CENTRE_MIDI - half,
      EMPTY_ROLL_CENTRE_MIDI + half,
    );
  }

  const lowest = Math.min(...visibleMidis) - ROLL_PADDING_SEMITONES;
  const highest = Math.max(...visibleMidis) + ROLL_PADDING_SEMITONES;
  const missing = MIN_ROLL_SPAN_SEMITONES - (highest - lowest);

  if (missing <= 0) {
    return buildRange(lowest, highest);
  }

  const below = Math.floor(missing / 2);

  return buildRange(lowest - below, highest + (missing - below));
};

const buildRange = (low: number, high: number): readonly RollRow[] => {
  const rows: RollRow[] = [];

  for (let midi = high; midi >= low; midi -= 1) {
    rows.push(toRow(midi));
  }

  return rows;
};

const toBar = (
  segment: NoteSegment,
  windowStartMs: number,
  windowMs: number,
): RollBar => {
  const x0 = Math.max(0, (segment.startMs - windowStartMs) / windowMs);
  const x1 = Math.min(1, (segment.endMs - windowStartMs) / windowMs);

  return {
    noteId: segment.noteId,
    midi: segment.midi,
    name: midiToNoteName(segment.midi),
    x0,
    x1,
    zone: centsZone(segment.meanAbsCents),
    isCurrent: segment.isOpen,
    showLabel: x1 - x0 >= MIN_LABEL_WIDTH,
  };
};

/**
 * The progression: sung notes as bars across a window that ends at the latest
 * frame (the leading edge), coloured by the zone of how close the note was.
 */
export const buildRoll = (
  history: PitchHistorySnapshot,
  windowSeconds: number,
): RollModel => {
  const windowMs = windowSeconds * MS_PER_SECOND;
  const windowStartMs = history.latestMs - windowMs;
  const bars = history.segments
    .filter((segment) => segment.endMs >= windowStartMs)
    .map((segment) => toBar(segment, windowStartMs, windowMs));

  return {
    windowSeconds,
    rows: buildRollRows(bars.map((bar) => bar.midi)),
    bars,
  };
};
