import type { PitchReading } from '@org/pitch-detection';

import { createPitchHistory, type PitchHistory } from './pitch-history';

export const FRAME_MS = 20;
export const A3 = 57;
export const B3 = 59;
export const C4 = 60;

const voiced = (
  noteId: number,
  midi: number,
  cents: number,
  startMs: number,
): PitchReading => ({
  active: true,
  held: false,
  midi,
  cents,
  frequencyHz: 220,
  clarity: 0.95,
  noteId,
  noteStartMs: startMs,
});

export type SungNote = { midi: number; cents: number; seconds: number };

/**
 * A history of notes sung back to back, one frame every 20 ms, starting at
 * `startMs`. Returns the history; its latest frame is the end of the last note.
 */
export const sing = (
  notes: readonly SungNote[],
  startMs = 0,
  history: PitchHistory = createPitchHistory(),
): PitchHistory => {
  let timeMs = startMs;

  notes.forEach((note) => {
    const frames = Math.round((note.seconds * 1000) / FRAME_MS);
    const noteStart = timeMs;

    for (let frame = 0; frame < frames; frame += 1) {
      // Unique across calls, so a later phrase is a new note, not the old one.
      history.push(
        timeMs,
        voiced(noteStart + 1, note.midi, note.cents, noteStart),
      );
      timeMs += FRAME_MS;
    }
  });

  return history;
};

export const reading = (midi: number, cents: number): PitchReading => {
  return voiced(1, midi, cents, 0);
};
