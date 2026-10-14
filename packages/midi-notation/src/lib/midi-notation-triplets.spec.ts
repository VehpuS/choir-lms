import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  detectTripletWindows,
  isTripletAt,
  nextGridPoint,
  snapToGrid,
} from './midi-notation-triplets.ts';

// Spans are note starts and ends in twelfths of a quarter: a 16th is 3 apart, a
// triplet eighth 4. Real notes end a little early, so ends are shortened.
const span = (start: number, end: number, played = 1) => ({
  end: start + (end - start) * played,
  start,
});
const SHORT = 0.93;

const jittered = (
  spans: Array<{ end: number; start: number }>,
  jitter: number,
) =>
  spans.map(({ start, end }, index) => ({
    end: end + (index % 2 === 0 ? jitter : -jitter),
    start: start + (index % 2 === 0 ? jitter : -jitter),
  }));

describe('detectTripletWindows', () => {
  const tripletBeat = [span(0, 4), span(4, 8), span(8, 12)];

  it('finds a beat of eighth-note triplets', () => {
    assert.deepEqual([...detectTripletWindows(tripletBeat)], [0]);
  });

  it('still finds them with loose timing and notes played a little short', () => {
    const played = [span(0, 4, SHORT), span(4, 8, SHORT), span(8, 12, SHORT)];

    assert.deepEqual([...detectTripletWindows(jittered(played, 0.3))], [0]);
  });

  it('leaves a beat of 16ths straight, even when played loosely and short', () => {
    const sixteenths = [
      span(0, 3, SHORT),
      span(3, 6, SHORT),
      span(6, 9, SHORT),
      span(9, 12, SHORT),
    ];

    assert.equal(detectTripletWindows(sixteenths).size, 0);
    assert.equal(detectTripletWindows(jittered(sixteenths, 0.6)).size, 0);
  });

  it('finds a quarter-then-eighth triplet beat, with the first note played short', () => {
    // The first note ends at 7.4, not 8, and the second at 11.7.
    assert.deepEqual(
      [...detectTripletWindows([span(0, 8, SHORT), span(8, 12, SHORT)])],
      [0],
    );
  });

  it('finds quarter-note triplets that run over two beats', () => {
    // Three notes of 8 units from 0, each played short: the second beat has
    // only one start (at 4) and a note end just before the third.
    const quarters = [
      span(0, 8, SHORT),
      span(8, 16, SHORT),
      span(16, 24, SHORT),
    ];

    assert.deepEqual([...detectTripletWindows(quarters)].sort(), [0, 1]);
  });

  it('judges each beat on its own', () => {
    const spans = [
      span(0, 6),
      span(6, 12),
      span(12, 16),
      span(16, 20),
      span(20, 24),
    ];

    assert.deepEqual([...detectTripletWindows(spans)], [1]);
  });

  it('does not call a single off-grid note a triplet', () => {
    assert.equal(detectTripletWindows([span(4, 12)]).size, 0);
  });

  it('ignores points on the beat edges, which fit both grids', () => {
    assert.equal(
      detectTripletWindows([span(0, 12), span(12, 24), span(24, 36)]).size,
      0,
    );
  });
});

describe('snapToGrid', () => {
  const triplets = new Set([1]);

  it('snaps to 16ths in a straight window and to thirds in a triplet window', () => {
    assert.equal(snapToGrid(4.4, new Set()), 3);
    assert.equal(snapToGrid(12 + 4.4, triplets), 16);
    assert.equal(snapToGrid(12 + 7.7, triplets), 20);
  });

  it('lands on the shared beat edges from either side', () => {
    assert.equal(snapToGrid(11.9, new Set()), 12);
    assert.equal(snapToGrid(23.8, triplets), 24);
    assert.equal(snapToGrid(12.2, triplets), 12);
  });
});

describe('nextGridPoint and isTripletAt', () => {
  it('steps by the grid of the window the time is in', () => {
    const triplets = new Set([1]);

    assert.equal(nextGridPoint(0, triplets), 3);
    assert.equal(nextGridPoint(12, triplets), 16);
    assert.equal(isTripletAt(13, triplets), true);
    assert.equal(isTripletAt(5, triplets), false);
  });
});
