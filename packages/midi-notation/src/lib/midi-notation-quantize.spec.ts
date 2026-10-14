import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assignVoices,
  groupChords,
  quantizeNotes,
  type GridEvent,
} from './midi-notation-quantize.ts';

const PPQ = 480;
const SIXTEENTH = PPQ / 4;
const options = {
  beatLength: 4,
  legatoSnap: 2,
  offset: 0,
  ticksPerQuarter: PPQ,
};
const raw = (midi: number, ticks: number, durationTicks: number) => ({
  durationTicks,
  midi,
  ticks,
});

describe('quantizeNotes', () => {
  it('snaps starts and ends to the nearest 16th', () => {
    // 20 ticks late, and a 7/8 of a quarter long: still beat 0, length 4.
    const [note] = quantizeNotes([raw(60, 20, 420)], options);

    assert.deepEqual(note, { end: 4, pitch: 60, start: 0 });
  });

  it('absorbs timing jitter of a few tens of milliseconds', () => {
    const notes = quantizeNotes(
      [raw(60, 0 - 0, 470), raw(62, 485, 470), raw(64, 955, 470)],
      options,
    );

    assert.deepEqual(
      notes.map(({ end, start }) => [start, end]),
      [
        [0, 4],
        [4, 8],
        [8, 12],
      ],
    );
  });

  it('keeps even a very short note one 16th long', () => {
    const [note] = quantizeNotes([raw(60, 0, 3)], options);

    assert.deepEqual([note?.start, note?.end], [0, 1]);
  });

  it('shifts every note later by the offset', () => {
    // 5 sixteenths long, so it ends on a beat (8) once shifted by 3.
    const [note] = quantizeNotes([raw(60, 0, SIXTEENTH * 5)], {
      ...options,
      offset: 3,
    });

    assert.deepEqual([note?.start, note?.end], [3, 8]);
  });

  it('closes a short gap before the next note but keeps a real rest', () => {
    const notes = quantizeNotes(
      [
        raw(60, 0, SIXTEENTH * 3), // ends at 3, next starts at 4: gap 1
        raw(62, SIXTEENTH * 4, SIXTEENTH * 2), // ends at 6, next at 9: gap 3
        raw(64, SIXTEENTH * 9, SIXTEENTH * 2), // last: ends at 11, closed up to 12
      ],
      options,
    );

    assert.deepEqual(
      notes.map(({ end }) => end),
      [4, 6, 12],
    );
  });

  it('closes the last note up to the next beat when it was played a touch short', () => {
    // Ends at 11 (a 16th before beat 12); a note ending 3 early is left alone.
    const [short] = quantizeNotes([raw(60, 0, SIXTEENTH * 11)], options);
    const [farShort] = quantizeNotes([raw(60, 0, SIXTEENTH * 9)], options);
    const [onBeat] = quantizeNotes([raw(60, 0, SIXTEENTH * 12)], options);

    assert.equal(short?.end, 12);
    assert.equal(farShort?.end, 9);
    assert.equal(onBeat?.end, 12);
  });

  it('closes chord mates together and does not treat one as the next note', () => {
    const notes = quantizeNotes(
      [raw(60, 0, SIXTEENTH * 3), raw(64, 0, SIXTEENTH * 3)],
      options,
    );

    assert.deepEqual(
      notes.map(({ end }) => end),
      [4, 4],
    );
  });

  it('orders notes by start, high pitch first', () => {
    const notes = quantizeNotes(
      [raw(48, 0, 480), raw(72, 0, 480), raw(60, 0, 480)],
      options,
    );

    assert.deepEqual(
      notes.map(({ pitch }) => pitch),
      [72, 60, 48],
    );
  });
});

describe('groupChords', () => {
  it('merges notes with the same start and end, highest pitch first', () => {
    const events = groupChords([
      { end: 4, pitch: 48, start: 0 },
      { end: 4, pitch: 64, start: 0 },
      { end: 4, pitch: 55, start: 0 },
      { end: 8, pitch: 60, start: 0 },
    ]);

    // At the same start the event with the higher top note comes first.
    assert.deepEqual(events, [
      { end: 4, pitches: [64, 55, 48], start: 0 },
      { end: 8, pitches: [60], start: 0 },
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
    const voices = assignVoices([event(0, 4, 60), event(4, 8, 62)]);

    assert.equal(voices.length, 1);
  });

  it('moves an overlapping note to a second voice and never overlaps within one', () => {
    const voices = assignVoices([
      event(0, 8, 72),
      event(0, 4, 60),
      event(4, 8, 62),
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
