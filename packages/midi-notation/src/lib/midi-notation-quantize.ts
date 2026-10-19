import { detectFineWindows, isFineAt } from './midi-notation-fine.ts';
import {
  UNITS_PER_QUARTER,
  UNITS_PER_SIXTEENTH,
  detectTripletWindows,
  isTripletAt,
  nextGridPoint,
  snapToGrid,
} from './midi-notation-triplets.ts';

/**
 * Gaps up to this many 16ths are performance gaps, not rests. One 16th: against
 * the real score of a score-exported file, a snap of 2 closed a written eighth
 * rest (a breath) into the note before it and left only 72 to 99 percent of
 * note lengths right, where 1 left 95 to 99 percent, and 1 stayed best on the
 * same file with timing and length jitter added (task 15.5 audit).
 */
export const DEFAULT_LEGATO_SNAP = 1;
/** A final note played this many units short is closed up to the next beat. */
const LAST_NOTE_SNAP_UNITS = UNITS_PER_SIXTEENTH;
/** Inside a triplet window a gap is at least a triplet eighth, so only a sliver is closed. */
const TRIPLET_SNAP_UNITS = 2;
/** Inside a 32nd window a gap is at least a 32nd (1.5 units), so only a sliver is closed. */
const FINE_SNAP_UNITS = 1;

export type RawMidiNote = {
  durationTicks: number;
  midi: number;
  ticks: number;
};

/** A note on the grid (twelfths of a quarter); `end` is exclusive and after `start`. */
export type GridNote = { end: number; pitch: number; start: number };

/** Notes that start and end together, written as one chord. Pitches run high to low. */
export type GridEvent = { end: number; pitches: number[]; start: number };

export type QuantizedLine = {
  notes: GridNote[];
  /** Quarter-note windows (from time zero) that hold 32nds. */
  fineWindows: Set<number>;
  /** Quarter-note windows (from time zero) that hold triplets. */
  tripletWindows: Set<number>;
};

/**
 * Snaps note starts and ends to the grid: 16ths, or eighth-note triplets in
 * the windows where the line's notes are triplets. `offset` (in units) shifts
 * everything later, to leave room for a pickup measure. A gap of up to
 * `legatoSnap` 16ths before the next note in the line is closed, because a
 * performed melody is rarely legato to the tick and the gap would otherwise
 * be written as a rest. A note with no later note is closed up to the next
 * beat when it stops a 16th short, so a final note played a touch short is
 * not left with a stray rest after it.
 */
export const quantizeNotes = (
  notes: readonly RawMidiNote[],
  options: {
    /** Length of one beat in units; the last note is closed up to a beat. */
    beatLength: number;
    legatoSnap: number;
    offset: number;
    ticksPerQuarter: number;
  },
): QuantizedLine => {
  const unitsPerTick = UNITS_PER_QUARTER / options.ticksPerQuarter;
  const timed = notes.map((note) => ({
    end: (note.ticks + note.durationTicks) * unitsPerTick + options.offset,
    pitch: note.midi,
    start: note.ticks * unitsPerTick + options.offset,
  }));
  const tripletWindows = detectTripletWindows(timed);
  const fineWindows = detectFineWindows(timed, tripletWindows);
  const quantized: GridNote[] = timed
    .map((note) => {
      const start = snapToGrid(note.start, tripletWindows, fineWindows);
      const end = snapToGrid(note.end, tripletWindows, fineWindows);

      return {
        end:
          end > start ? end : nextGridPoint(start, tripletWindows, fineWindows),
        pitch: note.pitch,
        start,
      };
    })
    .sort((a, b) => a.start - b.start || b.pitch - a.pitch);
  const legatoUnits = options.legatoSnap * UNITS_PER_SIXTEENTH;

  quantized.forEach((note, index) => {
    // The next note that begins later; chord mates at the same start do not count.
    const next = quantized
      .slice(index + 1)
      .find((other) => other.start > note.start);
    const target = next
      ? next.start
      : Math.ceil(note.end / options.beatLength) * options.beatLength;
    const limit = next
      ? legatoUnits
      : Math.min(LAST_NOTE_SNAP_UNITS, legatoUnits);
    const gap = target - note.end;
    const maxGap = isTripletAt(note.end, tripletWindows)
      ? Math.min(limit, TRIPLET_SNAP_UNITS)
      : isFineAt(note.end, fineWindows)
        ? Math.min(limit, FINE_SNAP_UNITS)
        : limit;

    if (gap > 0 && gap <= maxGap) {
      note.end = target;
    }
  });

  return { fineWindows, notes: quantized, tripletWindows };
};

/** Merges notes with the same start and end into one chord event. */
export const groupChords = (notes: readonly GridNote[]): GridEvent[] => {
  const events = new Map<string, GridEvent>();

  for (const note of notes) {
    const key = `${note.start}|${note.end}`;
    const event = events.get(key) ?? {
      end: note.end,
      pitches: [],
      start: note.start,
    };

    event.pitches.push(note.pitch);
    events.set(key, event);
  }

  return [...events.values()]
    .map((event) => ({
      ...event,
      pitches: [...new Set(event.pitches)].sort((a, b) => b - a),
    }))
    .sort(
      (a, b) => a.start - b.start || (b.pitches[0] ?? 0) - (a.pitches[0] ?? 0),
    );
};

/**
 * Places events into voices first-fit, so overlapping notes (a held note under
 * a moving line) land in different voices and no voice overlaps itself. The
 * highest line gets the first voice.
 */
export const assignVoices = (events: readonly GridEvent[]): GridEvent[][] => {
  const voices: GridEvent[][] = [];

  for (const event of events) {
    const voice = voices.find((candidate) => {
      const last = candidate[candidate.length - 1];

      return !last || last.end <= event.start;
    });

    if (voice) {
      voice.push(event);
    } else {
      voices.push([event]);
    }
  }

  return voices;
};
