import {
  UNITS_PER_QUARTER,
  UNITS_PER_SIXTEENTH,
} from './midi-notation-triplets.ts';

// A score's bars: where each starts and ends (in twelfths of a quarter), its
// time signature, and its key. MIDI files can change both mid-piece, so bars
// are not all the same length.

export const UNITS_PER_WHOLE_NOTE = UNITS_PER_QUARTER * 4;
export const DEFAULT_TIME_SIGNATURE: readonly [number, number] = [4, 4];

export type Meter = { beatType: number; beats: number; startUnit: number };
export type KeyChange = { fifths: number; startUnit: number };
export type BarSpec = {
  beatType: number;
  beats: number;
  end: number;
  fifths: number;
  start: number;
};

/** A time signature whose bar is a whole number of 16ths, or the default. */
export const readTimeSignature = (
  value: readonly number[] | undefined,
): [number, number] => {
  const [beats, beatType] = value ?? [];
  const barLength =
    beats && beatType ? (beats * UNITS_PER_WHOLE_NOTE) / beatType : 0;

  return beats &&
    beatType &&
    Number.isInteger(barLength) &&
    barLength > 0 &&
    barLength % UNITS_PER_SIXTEENTH === 0
    ? [beats, beatType]
    : [...DEFAULT_TIME_SIGNATURE];
};

export const meterBarLength = (meter: Pick<Meter, 'beatType' | 'beats'>) => {
  return (meter.beats * UNITS_PER_WHOLE_NOTE) / meter.beatType;
};

const tickToUnit = (ticks: number, ticksPerQuarter: number, offset: number) => {
  return Math.round((ticks * UNITS_PER_QUARTER) / ticksPerQuarter) + offset;
};

/**
 * The time signatures in order, from time signature events in a file. The first
 * always applies from the start (even if the file's first event comes later or
 * there is none); when events share a tick the first wins; a repeat of the
 * meter already in force is dropped. `offset` is the units the content is
 * shifted by to leave room for a pickup.
 */
export const buildMeterMap = (
  events: readonly { ticks: number; timeSignature: readonly number[] }[],
  ticksPerQuarter: number,
  offset = 0,
): Meter[] => {
  const sorted = [...events].sort((a, b) => a.ticks - b.ticks);
  const meters: Meter[] = [];
  const first = sorted[0];
  const [firstBeats, firstBeatType] = readTimeSignature(first?.timeSignature);

  meters.push({ beatType: firstBeatType, beats: firstBeats, startUnit: 0 });

  for (const event of sorted.slice(1)) {
    const startUnit = tickToUnit(event.ticks, ticksPerQuarter, offset);
    const [beats, beatType] = readTimeSignature(event.timeSignature);
    const last = meters[meters.length - 1];

    if (
      last &&
      startUnit > last.startUnit &&
      (last.beats !== beats || last.beatType !== beatType)
    ) {
      meters.push({ beatType, beats, startUnit });
    }
  }

  return meters;
};

/**
 * The key changes in order, one per tick (the first event at a tick wins). The
 * first applies from the start. Events without a readable key are skipped.
 */
export const buildKeyChanges = (
  events: readonly { fifths: number | undefined; ticks: number }[],
  ticksPerQuarter: number,
  offset = 0,
): KeyChange[] => {
  const seen = new Set<number>();
  const changes: KeyChange[] = [];

  for (const event of [...events].sort((a, b) => a.ticks - b.ticks)) {
    if (event.fifths === undefined || seen.has(event.ticks)) {
      continue;
    }

    seen.add(event.ticks);

    const last = changes[changes.length - 1];

    if (last && last.fifths === event.fifths) {
      continue;
    }

    changes.push({
      fifths: event.fifths,
      startUnit:
        changes.length === 0
          ? 0
          : tickToUnit(event.ticks, ticksPerQuarter, offset),
    });
  }

  return changes;
};

/**
 * Lays bars end to end until `endUnit`. A bar has the time signature in force
 * where it starts and is cut short where the next one begins (a change that
 * falls mid-bar). Its key is the latest change at or before its start, so a
 * key change mid-bar takes effect from the next bar. Stops after `maxBars` so
 * a huge or corrupt file cannot build an endless list.
 */
export const buildBars = (options: {
  defaultFifths: number;
  endUnit: number;
  keys: readonly KeyChange[];
  maxBars: number;
  meters: readonly Meter[];
}): BarSpec[] => {
  const bars: BarSpec[] = [];
  let cursor = 0;

  while (cursor < options.endUnit && bars.length <= options.maxBars) {
    const meter = [...options.meters]
      .reverse()
      .find((candidate) => candidate.startUnit <= cursor) ??
      options.meters[0] ?? {
        beatType: DEFAULT_TIME_SIGNATURE[1],
        beats: DEFAULT_TIME_SIGNATURE[0],
        startUnit: 0,
      };
    const nextChange = options.meters.find(
      (candidate) => candidate.startUnit > cursor,
    )?.startUnit;
    const fullEnd = cursor + meterBarLength(meter);
    const end =
      nextChange !== undefined && fullEnd > nextChange ? nextChange : fullEnd;
    const fifths =
      [...options.keys].reverse().find((key) => key.startUnit <= cursor)
        ?.fifths ?? options.defaultFifths;

    bars.push({
      beatType: meter.beatType,
      beats: meter.beats,
      end,
      fifths,
      start: cursor,
    });
    cursor = end;
  }

  return bars;
};

/** Equal bars with one time signature and key: for writing and tests that do not need more. */
export const uniformBars = (options: {
  barCount: number;
  beatType?: number;
  beats?: number;
  fifths?: number;
}): BarSpec[] => {
  const beats = options.beats ?? DEFAULT_TIME_SIGNATURE[0];
  const beatType = options.beatType ?? DEFAULT_TIME_SIGNATURE[1];
  const length = meterBarLength({ beatType, beats });

  return Array.from({ length: options.barCount }, (_, index) => ({
    beatType,
    beats,
    end: (index + 1) * length,
    fifths: options.fifths ?? 0,
    start: index * length,
  }));
};
