import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { detectFineWindows, isFineAt } from './midi-notation-fine.ts';
import {
  UNITS_PER_QUARTER,
  nextGridPoint,
  snapToGrid,
} from './midi-notation-triplets.ts';

const NO_TRIPLETS: ReadonlySet<number> = new Set();
const span = (start: number, end: number) => ({ end, start });

describe('detectFineWindows', () => {
  it('finds a beat holding a run of 32nds from two onsets exactly on 32nd points', () => {
    // 32nds at 0, 1.5, 3, 4.5 of the first beat, played slightly short.
    const spans = [
      span(0, 1.17),
      span(1.5, 2.67),
      span(3, 4.17),
      span(4.5, 5.67),
    ];

    assert.deepEqual([...detectFineWindows(spans, NO_TRIPLETS)], [0]);
  });

  it('finds a beat where a 16th is split into a pair of 32nds at its end', () => {
    // The beat is 16ths at 0, 3, 6, then a 32nd at 9 and a 32nd at 10.5: one
    // exact onset, and the 32nd before it ending just short of the 32nd point.
    const spans = [
      span(0, 2.67),
      span(3, 5.67),
      span(6, 8.67),
      span(9, 10.17),
      span(10.5, 11.67),
    ];

    assert.deepEqual([...detectFineWindows(spans, NO_TRIPLETS)], [0]);
  });

  it('counts the beat a span falls in, not only the first', () => {
    const second = UNITS_PER_QUARTER;

    assert.deepEqual(
      [
        ...detectFineWindows(
          [
            span(second + 1.5, second + 2.67),
            span(second + 3, second + 4.17),
            span(second + 4.5, second + 5.67),
          ],
          NO_TRIPLETS,
        ),
      ],
      [1],
    );
  });

  it('leaves an ordinary 16th line alone', () => {
    const spans = Array.from({ length: 8 }, (_, index) =>
      span(index * 3, index * 3 + 2.67),
    );

    assert.equal(detectFineWindows(spans, NO_TRIPLETS).size, 0);
  });

  it('needs more than a lone note on a 32nd point', () => {
    assert.equal(
      detectFineWindows([span(1.5, 2.67), span(3, 5.67)], NO_TRIPLETS).size,
      0,
    );
  });

  it('does not take timing noise for 32nds: positions near but not on the points', () => {
    const spans = [
      span(1.7, 2.9),
      span(4.3, 5.5),
      span(7.2, 8.4),
      span(10.2, 11.4),
    ];

    assert.equal(detectFineWindows(spans, NO_TRIPLETS).size, 0);
  });

  it('never calls a triplet beat fine', () => {
    const spans = [
      span(0, 1.17),
      span(1.5, 2.67),
      span(3, 4.17),
      span(4.5, 5.67),
    ];

    assert.equal(detectFineWindows(spans, new Set([0])).size, 0);
  });
});

describe('snapping on the 32nd grid', () => {
  const fine: ReadonlySet<number> = new Set([0]);

  it('snaps to the nearest 32nd inside a fine window and to 16ths elsewhere', () => {
    assert.equal(snapToGrid(4.4, NO_TRIPLETS, fine), 4.5);
    assert.equal(snapToGrid(1.2, NO_TRIPLETS, fine), 1.5);
    // The next beat is not fine, so 4.4 beyond the window edge snaps to a 16th.
    assert.equal(snapToGrid(UNITS_PER_QUARTER + 4.4, NO_TRIPLETS, fine), 15);
    assert.equal(snapToGrid(4.4, NO_TRIPLETS), 3);
  });

  it('steps a 32nd to the next grid point inside a fine window', () => {
    assert.equal(nextGridPoint(4.5, NO_TRIPLETS, fine), 6);
    assert.equal(nextGridPoint(4.5, NO_TRIPLETS), 7.5);
  });

  it('reports whether a time is in a fine window', () => {
    assert.equal(isFineAt(5, fine), true);
    assert.equal(isFineAt(13, fine), false);
  });
});
