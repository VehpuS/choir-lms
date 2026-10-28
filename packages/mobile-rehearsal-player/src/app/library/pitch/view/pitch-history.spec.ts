import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PitchReading } from '@org/pitch-detection';

import { createPitchHistory, HISTORY_MAX_MS } from './pitch-history.js';

const FRAME_MS = 20;
const IDLE: PitchReading = { active: false };

const voiced = (
  noteId: number,
  midi: number,
  cents: number,
  held = false,
): PitchReading => ({
  active: true,
  held,
  midi,
  cents,
  frequencyHz: 220,
  clarity: 0.95,
  noteId,
  noteStartMs: 0,
});

describe('pitch history', () => {
  it('is empty until a frame arrives and after clear', () => {
    const history = createPitchHistory();

    assert.deepEqual(history.getSnapshot().segments, []);

    history.push(0, voiced(1, 57, 0));
    history.clear();

    assert.deepEqual(history.getSnapshot().segments, []);
    assert.deepEqual(history.getSnapshot().trace, []);
  });

  it('grows one segment while a note continues and averages its cents', () => {
    const history = createPitchHistory();

    history.push(0, voiced(1, 57, 10));
    history.push(FRAME_MS, voiced(1, 57, -20));
    history.push(2 * FRAME_MS, voiced(1, 57, 0));

    const { segments, trace } = history.getSnapshot();

    assert.equal(segments.length, 1);
    assert.equal(segments[0].endMs, 2 * FRAME_MS);
    assert.equal(segments[0].isOpen, true);
    assert.equal(segments[0].meanAbsCents, 10);
    assert.equal(trace.length, 3);
  });

  it('starts a new segment when the note changes and closes the old one', () => {
    const history = createPitchHistory();

    history.push(0, voiced(1, 57, 0));
    history.push(FRAME_MS, voiced(2, 59, 5));

    const { segments } = history.getSnapshot();

    assert.deepEqual(
      segments.map((segment) => [segment.midi, segment.isOpen]),
      [
        [57, false],
        [59, true],
      ],
    );
  });

  it('closes the note after a gap and marks the line to restart', () => {
    const history = createPitchHistory();

    history.push(0, voiced(1, 57, 0));
    history.push(FRAME_MS, IDLE);
    history.push(2 * FRAME_MS, voiced(2, 57, 0));

    const { segments, trace } = history.getSnapshot();

    assert.equal(segments[0].isOpen, false);
    assert.deepEqual(
      trace.map((sample) => sample.startsRun),
      [true, true],
    );
  });

  it('keeps a held note open through a short gap without drawing it', () => {
    const history = createPitchHistory();

    history.push(0, voiced(1, 57, 0));
    history.push(FRAME_MS, voiced(1, 57, 0, true));
    history.push(2 * FRAME_MS, voiced(1, 57, 0));

    const { segments, trace } = history.getSnapshot();

    assert.equal(segments.length, 1);
    assert.equal(segments[0].isOpen, true);
    assert.deepEqual(
      trace.map((sample) => sample.startsRun),
      [true, true],
    );
    assert.equal(trace.length, 2);
  });

  it('keeps no more than the widest zoom window', () => {
    const history = createPitchHistory();

    history.push(0, voiced(1, 57, 0));
    history.push(1000, IDLE);
    history.push(HISTORY_MAX_MS + 5000, voiced(2, 60, 0));

    const { segments, trace } = history.getSnapshot();

    assert.deepEqual(
      segments.map((segment) => segment.noteId),
      [2],
    );
    assert.equal(trace.length, 1);
    assert.equal(history.getSnapshot().latestMs, HISTORY_MAX_MS + 5000);
  });

  it('gives a new snapshot object after each change', () => {
    const history = createPitchHistory();
    const first = history.getSnapshot();

    history.push(0, voiced(1, 57, 0));

    assert.notEqual(history.getSnapshot(), first);
  });
});
