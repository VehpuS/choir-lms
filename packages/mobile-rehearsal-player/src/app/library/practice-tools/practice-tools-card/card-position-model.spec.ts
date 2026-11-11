import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clampCardOffset,
  DEFAULT_CARD_OFFSET,
  dragCardOffset,
  isTapMovement,
} from './card-position-model.js';

const CARD = { height: 120, width: 268 };
const AREA = { height: 360, width: 700 };

describe('card position', () => {
  it('starts in the lower trailing corner', () => {
    assert.deepEqual(DEFAULT_CARD_OFFSET, { bottom: 12, right: 14 });
  });

  it('moves with the drag: left and up grow the offsets', () => {
    assert.deepEqual(
      dragCardOffset(DEFAULT_CARD_OFFSET, { x: -300, y: -120 }, CARD, AREA),
      { bottom: 132, right: 314 },
    );
  });

  it('moving right and down shrinks the offsets', () => {
    assert.deepEqual(
      dragCardOffset({ bottom: 100, right: 100 }, { x: 40, y: 30 }, CARD, AREA),
      { bottom: 70, right: 60 },
    );
  });

  it('never leaves the area on the leading or top edge', () => {
    assert.deepEqual(
      dragCardOffset(DEFAULT_CARD_OFFSET, { x: -5000, y: -5000 }, CARD, AREA),
      { bottom: 240, right: 432 },
    );
  });

  it('never leaves the area on the trailing or bottom edge', () => {
    assert.deepEqual(
      dragCardOffset(DEFAULT_CARD_OFFSET, { x: 5000, y: 5000 }, CARD, AREA),
      { bottom: 0, right: 0 },
    );
  });

  it('pulls a stored offset back in when the window shrinks', () => {
    assert.deepEqual(
      clampCardOffset({ bottom: 240, right: 432 }, CARD, {
        height: 300,
        width: 500,
      }),
      { bottom: 180, right: 232 },
    );
  });

  it('keeps the offset until the area is measured', () => {
    const offset = { bottom: 50, right: 50 };

    assert.equal(
      clampCardOffset(offset, CARD, { height: 0, width: 0 }),
      offset,
    );
  });

  it('counts a press that barely moved as a tap', () => {
    assert.equal(isTapMovement({ x: 1, y: 2 }), true);
    assert.equal(isTapMovement({ x: 10, y: 0 }), false);
  });
});
