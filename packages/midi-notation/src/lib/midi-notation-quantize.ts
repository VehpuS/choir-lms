/** Notation is built on a 16th-note grid. */
export const GRID_PER_QUARTER = 4;
/** Gaps up to this many 16ths are performance gaps, not rests. */
export const DEFAULT_LEGATO_SNAP = 2;

export type RawMidiNote = {
  durationTicks: number;
  midi: number;
  ticks: number;
};

/** A note on the grid; `end` is exclusive and at least one 16th after `start`. */
export type GridNote = { end: number; pitch: number; start: number };

/** Notes that start and end together, written as one chord. Pitches run high to low. */
export type GridEvent = { end: number; pitches: number[]; start: number };

/**
 * Snaps note starts and ends to the 16th grid. `offset` shifts everything
 * later (used to leave room for a pickup measure). A gap of up to
 * `legatoSnap` 16ths before the next note in the line is closed, because a
 * performed melody is rarely legato to the tick and the gap would otherwise
 * be written as a rest. A note with no later note is closed up to the next
 * beat the same way, so a final note played a touch short is not left with a
 * stray 16th rest after it.
 */
export const quantizeNotes = (
  notes: readonly RawMidiNote[],
  options: {
    /** Length of one beat in 16ths; the last note is closed up to a beat. */
    beatLength: number;
    legatoSnap: number;
    offset: number;
    ticksPerQuarter: number;
  },
): GridNote[] => {
  const gridTicks = options.ticksPerQuarter / GRID_PER_QUARTER;
  const snap = (ticks: number) =>
    Math.round(ticks / gridTicks) + options.offset;
  const quantized = notes
    .map((note) => {
      const start = snap(note.ticks);

      return {
        end: Math.max(start + 1, snap(note.ticks + note.durationTicks)),
        pitch: note.midi,
        start,
      };
    })
    .sort((a, b) => a.start - b.start || b.pitch - a.pitch);

  quantized.forEach((note, index) => {
    // The next note that begins later; chord mates at the same start do not count.
    const next = quantized
      .slice(index + 1)
      .find((other) => other.start > note.start);
    // With no later note, the line ends: close up to the next beat instead.
    const target = next
      ? next.start
      : Math.ceil(note.end / options.beatLength) * options.beatLength;
    const gap = target - note.end;

    if (gap > 0 && gap <= options.legatoSnap) {
      note.end = target;
    }
  });

  return quantized;
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
