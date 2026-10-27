/** A pitch must stay on a note this long before it becomes that note. */
export const MIN_NOTE_STABLE_MS = 80;
/** A gap (a breath, a consonant) up to this long keeps the note. */
export const NOTE_HOLD_MS = 250;
/**
 * Semitones from a note's centre within which a pitch still belongs to it.
 * Wider than 0.5 so vibrato across a boundary does not split one note.
 */
export const NOTE_HYSTERESIS_SEMITONES = 0.65;

export type SegmentedNote = {
  id: number;
  midi: number;
  startMs: number;
};

export type NoteSegmenterOutput = {
  note: SegmentedNote | null;
  /** True while the note is kept through a gap with no pitch. */
  held: boolean;
};

export type NoteSegmenter = {
  /** `pitchMidi` is the smoothed fractional MIDI note, or null with no pitch. */
  push: (timeMs: number, pitchMidi: number | null) => NoteSegmenterOutput;
  reset: () => void;
};

type OpenNote = SegmentedNote & { lastVoicedMs: number };
type Candidate = { midi: number; sinceMs: number };

/**
 * Turns a stream of smoothed pitches into notes: a pitch that stays near one
 * note for long enough starts it, and silence shorter than the hold keeps it.
 */
export const createNoteSegmenter = (): NoteSegmenter => {
  let nextId = 1;
  let note: OpenNote | null = null;
  let candidate: Candidate | null = null;

  const output = (held: boolean): NoteSegmenterOutput => {
    return {
      note: note
        ? { id: note.id, midi: note.midi, startMs: note.startMs }
        : null,
      held,
    };
  };

  const pushVoiced = (timeMs: number, pitchMidi: number) => {
    if (note && Math.abs(pitchMidi - note.midi) <= NOTE_HYSTERESIS_SEMITONES) {
      note.lastVoicedMs = timeMs;
      candidate = null;

      return output(false);
    }

    if (
      !candidate ||
      Math.abs(pitchMidi - candidate.midi) > NOTE_HYSTERESIS_SEMITONES
    ) {
      candidate = { midi: Math.round(pitchMidi), sinceMs: timeMs };
    }

    if (timeMs - candidate.sinceMs >= MIN_NOTE_STABLE_MS) {
      note = {
        id: nextId++,
        midi: candidate.midi,
        startMs: candidate.sinceMs,
        lastVoicedMs: timeMs,
      };
      candidate = null;

      return output(false);
    }

    // The previous note, if any, is held until the new one is established.
    return output(note !== null);
  };

  const pushUnvoiced = (timeMs: number) => {
    // A gap breaks the run of agreeing frames a new note needs.
    candidate = null;

    if (note && timeMs - note.lastVoicedMs > NOTE_HOLD_MS) {
      note = null;
    }

    return output(note !== null);
  };

  return {
    push: (timeMs, pitchMidi) => {
      return pitchMidi === null
        ? pushUnvoiced(timeMs)
        : pushVoiced(timeMs, pitchMidi);
    },
    reset: () => {
      note = null;
      candidate = null;
    },
  };
};
