import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BAR_JUMP_LEAD_PX,
  computeBarScrollLeft,
  readBarOffsets,
  type MeasureRow,
} from './bar-offsets';

const measure = (x: number) => ({
  PositionAndShape: { AbsolutePosition: { x } },
});

describe('readBarOffsets', () => {
  const list: MeasureRow[] = [
    [measure(13.5), measure(0), measure(13.5)],
    [measure(39.5), measure(0), measure(39.5)],
    [measure(0), measure(55.25)],
    undefined,
    [measure(86.5)],
  ];

  it('reads each bar from the first staff that was laid out, in pixels', () => {
    assert.deepEqual(
      [...readBarOffsets(list, 1, 3)],
      [
        [1, 135],
        [2, 395],
        [3, 552.5],
      ],
    );
  });

  it('leaves out a bar that was not drawn and respects the range', () => {
    assert.deepEqual(
      [...readBarOffsets(list, 3, 5)],
      [
        [3, 552.5],
        [5, 865],
      ],
    );
    assert.equal(readBarOffsets(list, 9, 12).size, 0);
  });
});

describe('computeBarScrollLeft', () => {
  it('places the bar a little in from the left edge, scaled by the zoom', () => {
    assert.equal(
      computeBarScrollLeft({ barOffset: 1000, zoom: 1.25 }),
      1250 - BAR_JUMP_LEAD_PX,
    );
  });

  it('adds where the drawing starts in the strip', () => {
    assert.equal(
      computeBarScrollLeft({ barOffset: 200, drawingLeft: 5400, zoom: 1 }),
      5400 + 200 - BAR_JUMP_LEAD_PX,
    );
  });

  it('never scrolls to a negative position', () => {
    assert.equal(computeBarScrollLeft({ barOffset: 5, zoom: 1 }), 0);
  });
});
