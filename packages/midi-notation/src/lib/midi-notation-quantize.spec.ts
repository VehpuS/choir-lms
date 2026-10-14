import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assignVoices,
  groupChords,
  quantizeNotes,
  type GridEvent,
} from './midi-notation-quantize.ts';

const PPQ = 480;
const UNIT = PPQ / 12;
const SIXTEENTH = PPQ / 4;
const options = {
  beatLength: 12,
  legatoSnap: 2,
  offset: 0,
  ticksPerQuarter: PPQ,
};
const raw = (midi: number, ticks: number, durationTicks: number) => ({
  durationTicks,
  midi,
  ticks,
});
/** A note given in grid units (twelfths of a quarter). */
const inUnits = (midi: number, start: number, length: number) =>
  raw(midi, start * UNIT, length * UNIT);
const spans = (line: { notes: Array<{ end: number; start: number }> }) =>
  line.notes.map(({ start, end }) => [start, end]);

describe('quantizeNotes', () => {
  it('snaps starts and ends to the nearest 16th', () => {
    // 20 ticks late, and 7/8 of a quarter long: starts at 0, lasts a quarter.
    const [note] = quantizeNotes([raw(60, 20, 420)], options).notes;

    assert.deepEqual(note, { end: 12, pitch: 60, start: 0 });
  });

  it('absorbs timing jitter of a few tens of milliseconds', () => {
    const line = quantizeNotes(
      [raw(60, 0, 470), raw(62, 485, 470), raw(64, 955, 470)],
      options,
    );

    assert.deepEqual(spans(line), [
      [0, 12],
      [12, 24],
      [24, 36],
    ]);
  });

  it('keeps even a very short note one grid step long', () => {
    const [note] = quantizeNotes([raw(60, 0, 3)], options).notes;

    assert.deepEqual([note?.start, note?.end], [0, 3]);
  });

  it('shifts every note later by the offset', () => {
    // 15 units long, so it ends on a beat (24) once shifted by 9.
    const [note] = quantizeNotes([inUnits(60, 0, 15)], {
      ...options,
      offset: 9,
    }).notes;

    assert.deepEqual([note?.start, note?.end], [9, 24]);
  });

  it('closes a short gap before the next note but keeps a real rest', () => {
    const line = quantizeNotes(
      [
        inUnits(60, 0, 9), // ends at 9, next starts at 12: gap of a 16th
        inUnits(62, 12, 6), // ends at 18, next at 27: gap of three 16ths
        inUnits(64, 27, 6), // last: ends at 33, closed up to 36
      ],
      options,
    );

    assert.deepEqual(
      line.notes.map(({ end }) => end),
      [12, 18, 36],
    );
  });

  it('closes the last note up to the beat only when it stops a 16th short', () => {
    const end = (units: number) =>
      quantizeNotes([inUnits(60, 0, units)], options).notes[0]?.end;

    assert.equal(end(9), 12); // a dotted eighth played short of the beat
    assert.equal(end(6), 6); // a final eighth stays an eighth
    assert.equal(end(12), 12);
  });

  it('closes chord mates together and does not treat one as the next note', () => {
    const line = quantizeNotes(
      [raw(60, 0, SIXTEENTH * 3), raw(64, 0, SIXTEENTH * 3)],
      options,
    );

    assert.deepEqual(
      line.notes.map(({ end }) => end),
      [12, 12],
    );
  });

  it('orders notes by start, high pitch first', () => {
    const line = quantizeNotes(
      [raw(48, 0, 480), raw(72, 0, 480), raw(60, 0, 480)],
      options,
    );

    assert.deepEqual(
      line.notes.map(({ pitch }) => pitch),
      [72, 60, 48],
    );
  });
});

describe('quantizeNotes with triplets', () => {
  it('snaps a beat of triplets to thirds of the beat', () => {
    const line = quantizeNotes(
      [inUnits(67, 0, 4), inUnits(69, 4, 4), inUnits(71, 8, 4)],
      options,
    );

    assert.deepEqual([...line.tripletWindows], [0]);
    assert.deepEqual(spans(line), [
      [0, 4],
      [4, 8],
      [8, 12],
    ]);
  });

  it('still finds triplets in notes played loosely and a little short', () => {
    const jitter = [8, -6, 5];
    const line = quantizeNotes(
      [0, 4, 8].map((start, index) =>
        raw(67 + index, start * UNIT + (jitter[index] ?? 0), UNIT * 3.7),
      ),
      options,
    );

    assert.deepEqual([...line.tripletWindows], [0]);
    assert.deepEqual(spans(line), [
      [0, 4],
      [4, 8],
      [8, 12],
    ]);
  });

  it('finds a quarter-then-eighth triplet beat', () => {
    const line = quantizeNotes([inUnits(60, 0, 8), inUnits(62, 8, 4)], options);

    assert.deepEqual(spans(line), [
      [0, 8],
      [8, 12],
    ]);
  });

  it('mixes straight and triplet beats in one line', () => {
    const line = quantizeNotes(
      [
        inUnits(60, 0, 6),
        inUnits(62, 6, 6),
        inUnits(64, 12, 4),
        inUnits(65, 16, 4),
        inUnits(67, 20, 4),
      ],
      options,
    );

    assert.deepEqual([...line.tripletWindows], [1]);
    assert.deepEqual(spans(line), [
      [0, 6],
      [6, 12],
      [12, 16],
      [16, 20],
      [20, 24],
    ]);
  });

  it('keeps straight 16ths straight', () => {
    const line = quantizeNotes(
      [0, 3, 6, 9].map((start, index) =>
        raw(60 + index, start * UNIT + (index % 2 === 0 ? 6 : -6), UNIT * 3),
      ),
      options,
    );

    assert.equal(line.tripletWindows.size, 0);
    assert.deepEqual(spans(line), [
      [0, 3],
      [3, 6],
      [6, 9],
      [9, 12],
    ]);
  });

  it('does not close a triplet-eighth rest as if it were a performance gap', () => {
    const line = quantizeNotes(
      [
        inUnits(60, 0, 4),
        inUnits(62, 4, 4),
        inUnits(64, 12, 4),
        inUnits(65, 20, 4),
      ],
      options,
    );
    // Beat 0 holds a note, a note, and a rest; the first note must not be stretched.
    const first = line.notes[0];

    assert.equal(first?.end, 4);
  });

  it('leaves a single off-grid note straight', () => {
    // One note at a third of the beat is not enough to call the beat triplets.
    const line = quantizeNotes([inUnits(60, 4, 8)], options);

    assert.equal(line.tripletWindows.size, 0);
    assert.equal(line.notes[0]?.start, 3);
  });
});

describe('groupChords', () => {
  it('merges notes with the same start and end, highest pitch first', () => {
    const events = groupChords([
      { end: 12, pitch: 48, start: 0 },
      { end: 12, pitch: 64, start: 0 },
      { end: 12, pitch: 55, start: 0 },
      { end: 24, pitch: 60, start: 0 },
    ]);

    // At the same start the event with the higher top note comes first.
    assert.deepEqual(events, [
      { end: 12, pitches: [64, 55, 48], start: 0 },
      { end: 24, pitches: [60], start: 0 },
    ]);
  });
});

describe('assignVoices', () => {
  const event = (start: number, end: number, pitch: number): GridEvent => ({
    end,
    pitches: [pitch],
    start,
  });

  it('keeps a single line in one voice', () => {
    assert.equal(assignVoices([event(0, 12, 60), event(12, 24, 62)]).length, 1);
  });

  it('moves an overlapping note to a second voice and never overlaps within one', () => {
    const voices = assignVoices([
      event(0, 24, 72),
      event(0, 12, 60),
      event(12, 24, 62),
    ]);

    assert.equal(voices.length, 2);

    for (const voice of voices) {
      voice.forEach((current, index) => {
        const previous = voice[index - 1];

        assert.ok(!previous || previous.end <= current.start);
      });
    }
  });
});
