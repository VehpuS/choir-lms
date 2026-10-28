import type { PitchReading } from '@org/pitch-detection';

/** The widest time zoom of the Pitch view: nothing older is kept. */
export const HISTORY_MAX_MS = 60_000;

export type NoteSegment = {
  noteId: number;
  /** The nearest note the segment sits on. */
  midi: number;
  startMs: number;
  endMs: number;
  /** Running mean of the absolute cents from the note over the segment. */
  meanAbsCents: number;
  /** False once the note has ended (a gap longer than the hold, or a new note). */
  isOpen: boolean;
};

export type TraceSample = {
  timeMs: number;
  /** The nearest note and the offset from it, as the pipeline reported them. */
  midi: number;
  cents: number;
  /** The first voiced frame after a gap: the line is not drawn from before it. */
  startsRun: boolean;
};

export type PitchHistorySnapshot = {
  segments: readonly NoteSegment[];
  trace: readonly TraceSample[];
  /** The time of the latest frame seen; the roll's leading edge. */
  latestMs: number;
};

export type PitchHistory = {
  push: (timeMs: number, reading: PitchReading) => void;
  /** A new object only after the history changed, so readers can compare. */
  getSnapshot: () => PitchHistorySnapshot;
  clear: () => void;
};

const EMPTY_SNAPSHOT: PitchHistorySnapshot = {
  segments: [],
  trace: [],
  latestMs: 0,
};

/**
 * The Pitch view's memory (design Decision 15): note segments and a cents
 * trace at the frame rate, held only in memory, capped to the widest zoom
 * window and dropped when listening stops. It never stores audio.
 */
export const createPitchHistory = (): PitchHistory => {
  let segments: NoteSegment[] = [];
  let trace: TraceSample[] = [];
  let latestMs = 0;
  let snapshot = EMPTY_SNAPSHOT;
  let afterGap = true;
  let sampleCount = 0;

  const closeOpen = () => {
    const last = segments.at(-1);

    if (last?.isOpen) {
      last.isOpen = false;
    }
  };

  const trim = (nowMs: number) => {
    const oldest = nowMs - HISTORY_MAX_MS;

    segments = segments.filter((segment) => segment.endMs >= oldest);
    trace = trace.filter((sample) => sample.timeMs >= oldest);
  };

  const addVoiced = (
    timeMs: number,
    reading: Extract<PitchReading, { active: true }>,
  ) => {
    trace.push({
      timeMs,
      midi: reading.midi,
      cents: reading.cents,
      startsRun: afterGap,
    });
    afterGap = false;

    const last = segments.at(-1);

    if (last?.isOpen && last.noteId === reading.noteId) {
      sampleCount += 1;
      last.endMs = timeMs;
      last.meanAbsCents +=
        (Math.abs(reading.cents) - last.meanAbsCents) / sampleCount;

      return;
    }

    closeOpen();
    sampleCount = 1;
    segments.push({
      noteId: reading.noteId,
      midi: reading.midi,
      startMs: reading.noteStartMs,
      endMs: timeMs,
      meanAbsCents: Math.abs(reading.cents),
      isOpen: true,
    });
  };

  return {
    push: (timeMs, reading) => {
      latestMs = timeMs;

      if (!reading.active) {
        // A gap past the hold: the note is over and the line breaks.
        closeOpen();
        afterGap = true;
      } else if (reading.held) {
        // Kept through a gap: the note stays open but nothing is drawn.
        afterGap = true;
      } else {
        addVoiced(timeMs, reading);
      }

      trim(timeMs);
      snapshot = { segments, trace, latestMs };
    },
    getSnapshot: () => snapshot,
    clear: () => {
      segments = [];
      trace = [];
      latestMs = 0;
      afterGap = true;
      sampleCount = 0;
      snapshot = EMPTY_SNAPSHOT;
    },
  };
};
