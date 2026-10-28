import type { CentsZone } from '@org/audio-library-models';

import { FOCUS_BANDS, type FocusPoint } from './pitch-focus-model';
import type { RollModel } from './pitch-roll-model';

export type Size = { width: number; height: number };

const SEMITONES_PER_OCTAVE = 12;
const BLACK_KEY_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);
/** The roll draws a faint time line this many times across its window. */
const ROLL_TIME_DIVISIONS = 6;
const MIN_BAR_WIDTH = 3;
const BAR_VERTICAL_INSET = 1;
/** The focus panel shows a little past ±50 so the edge bands are not clipped. */
export const FOCUS_PANEL_RANGE_CENTS = 62;
const FOCUS_VERTICAL_PADDING = 4;

const isBlackKey = (midi: number) => {
  const pitchClass =
    ((midi % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) %
    SEMITONES_PER_OCTAVE;

  return BLACK_KEY_PITCH_CLASSES.has(pitchClass);
};

export type RollRowLayout = {
  midi: number;
  name: string;
  y: number;
  height: number;
  isOctave: boolean;
  isBlackKey: boolean;
};

export type RollBarLayout = {
  noteId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  zone: CentsZone;
  isCurrent: boolean;
  /** The note name, only where the bar is wide enough to read it. */
  label: string | null;
};

export type RollLayout = {
  rows: readonly RollRowLayout[];
  bars: readonly RollBarLayout[];
  /** X positions of the faint time lines. */
  gridX: readonly number[];
  /** The row to highlight as the target, when it is on screen. */
  targetRow: { y: number; height: number } | null;
};

/** Where every row, bar and time line of the roll sits in a measured box. */
export const layoutRoll = (
  roll: RollModel,
  size: Size,
  targetMidi: number | null,
): RollLayout => {
  const rowHeight = size.height / roll.rows.length;
  const top = roll.rows[0].midi;
  const yOf = (midi: number) => (top - midi) * rowHeight;
  const rows = roll.rows.map((row) => ({
    midi: row.midi,
    name: row.name,
    y: yOf(row.midi),
    height: rowHeight,
    isOctave: row.isOctave,
    isBlackKey: isBlackKey(row.midi),
  }));
  const bars = roll.bars.flatMap((bar) => {
    const y = yOf(bar.midi);

    if (y < 0 || y >= size.height) {
      return [];
    }

    return [
      {
        noteId: bar.noteId,
        x: bar.x0 * size.width,
        y: y + BAR_VERTICAL_INSET,
        width: Math.max(MIN_BAR_WIDTH, (bar.x1 - bar.x0) * size.width),
        height: rowHeight - 2 * BAR_VERTICAL_INSET,
        zone: bar.zone,
        isCurrent: bar.isCurrent,
        label: bar.showLabel ? bar.name : null,
      },
    ];
  });
  const gridX = Array.from(
    { length: ROLL_TIME_DIVISIONS - 1 },
    (_, index) => (size.width * (index + 1)) / ROLL_TIME_DIVISIONS,
  );
  const targetY = targetMidi === null ? null : yOf(targetMidi);
  const isTargetShown =
    targetY !== null && targetY >= 0 && targetY < size.height;

  return {
    rows,
    bars,
    gridX,
    targetRow: isTargetShown ? { y: targetY, height: rowHeight } : null,
  };
};

export type FocusBandLayout = {
  zone: CentsZone;
  label: string;
  limitCents: number;
  /** The band spans from `y` down `height`, centred on the target line. */
  y: number;
  height: number;
  /** Where the dashed limit lines sit (above and below the centre). */
  upperY: number;
  lowerY: number;
};

export type FocusLayout = {
  bands: readonly FocusBandLayout[];
  centreY: number;
  /** One polyline per unbroken run of sound. */
  runs: readonly (readonly [number, number][])[];
  current: { x: number; y: number; zone: CentsZone } | null;
  /** Points past the panel's edge show an arrow; null while within it. */
  marker: 'up' | 'down' | null;
};

/** The focus panel's bands, trace and current dot for a measured box. */
export const layoutFocus = (
  points: readonly FocusPoint[],
  size: Size,
  /** Space kept clear on the right for the band labels and the dot. */
  rightGutter: number,
): FocusLayout => {
  const half = size.height / 2 - FOCUS_VERTICAL_PADDING;
  const yOf = (cents: number) =>
    size.height / 2 - (cents / FOCUS_PANEL_RANGE_CENTS) * half;
  const plotWidth = Math.max(0, size.width - rightGutter);
  const bands = FOCUS_BANDS.map((band) => ({
    zone: band.zone,
    label: band.label,
    limitCents: band.limitCents,
    y: yOf(band.limitCents),
    height: yOf(-band.limitCents) - yOf(band.limitCents),
    upperY: yOf(band.limitCents),
    lowerY: yOf(-band.limitCents),
  }));
  const runs: [number, number][][] = [];

  points.forEach((point) => {
    const position: [number, number] = [point.x * plotWidth, yOf(point.cents)];

    if (point.startsRun || runs.length === 0) {
      runs.push([position]);
    } else {
      runs[runs.length - 1].push(position);
    }
  });

  const last = points.at(-1);

  return {
    bands,
    centreY: yOf(0),
    runs,
    current: last
      ? {
          x: last.x * plotWidth,
          y: yOf(last.cents),
          zone: last.zone,
        }
      : null,
    marker: last?.clamped ?? null,
  };
};
