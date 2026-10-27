import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createNoteSegmenter,
  MIN_NOTE_STABLE_MS,
  NOTE_HOLD_MS,
  type NoteSegmenter,
} from './note-segmenter.ts';

const STEP_MS = 20;

/** Pushes the same pitch (or silence) every 20 ms and returns the last output. */
const run = (
  segmenter: NoteSegmenter,
  startMs: number,
  durationMs: number,
  pitchMidi: number | null,
) => {
  let output = segmenter.push(startMs, pitchMidi);

  for (
    let time = startMs + STEP_MS;
    time <= startMs + durationMs;
    time += STEP_MS
  ) {
    output = segmenter.push(time, pitchMidi);
  }

  return output;
};

describe('createNoteSegmenter', () => {
  it('does not start a note before the pitch has been stable long enough', () => {
    const segmenter = createNoteSegmenter();

    assert.equal(
      run(segmenter, 0, MIN_NOTE_STABLE_MS - STEP_MS, 57).note,
      null,
    );
  });

  it('starts a note once stable, dated from when the pitch began', () => {
    const segmenter = createNoteSegmenter();
    const { note } = run(segmenter, 100, MIN_NOTE_STABLE_MS + STEP_MS, 57);

    assert.equal(note?.midi, 57);
    assert.equal(note?.startMs, 100);
  });

  it('keeps one note through vibrato around the boundary', () => {
    const segmenter = createNoteSegmenter();
    const first = run(segmenter, 0, 200, 57).note;
    let id = first?.id;

    for (let time = 220; time < 1000; time += STEP_MS) {
      // ±0.6 semitones swing, past the 0.5 rounding edge but inside hysteresis.
      const pitch = 57 + 0.6 * Math.sin(time / 50);

      id = segmenter.push(time, pitch).note?.id;
    }

    assert.equal(id, first?.id);
  });

  it('holds the note through a short gap and ends it after a long one', () => {
    const segmenter = createNoteSegmenter();

    run(segmenter, 0, 300, 57);
    const during = segmenter.push(300 + NOTE_HOLD_MS, null);
    const after = segmenter.push(300 + NOTE_HOLD_MS + STEP_MS * 2, null);

    assert.equal(during.note?.midi, 57);
    assert.equal(during.held, true);
    assert.equal(after.note, null);
  });

  it('continues the same note after a breath', () => {
    const segmenter = createNoteSegmenter();
    const before = run(segmenter, 0, 300, 57).note;

    run(segmenter, 320, 100, null);
    const after = run(segmenter, 440, 100, 57).note;

    assert.equal(after?.id, before?.id);
  });

  it('moves to a new note only after it is stable, keeping the old one until then', () => {
    const segmenter = createNoteSegmenter();
    const first = run(segmenter, 0, 300, 57).note;
    const early = run(segmenter, 320, MIN_NOTE_STABLE_MS - STEP_MS, 59);
    const settled = run(segmenter, 320 + MIN_NOTE_STABLE_MS, STEP_MS * 3, 59);

    assert.equal(early.note?.id, first?.id);
    assert.equal(settled.note?.midi, 59);
    assert.notEqual(settled.note?.id, first?.id);
  });

  it('ignores a one-frame glitch between two frames of the same note', () => {
    const segmenter = createNoteSegmenter();
    const first = run(segmenter, 0, 300, 57).note;

    segmenter.push(320, 69);
    const after = segmenter.push(340, 57);

    assert.equal(after.note?.id, first?.id);
  });
});
