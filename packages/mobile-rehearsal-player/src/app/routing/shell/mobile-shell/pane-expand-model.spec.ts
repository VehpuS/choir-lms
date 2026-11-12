import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canStartPaneDrag,
  dragShiftOffset,
  EXPAND_DRAG_DISTANCE,
  isDrag,
  MAX_DRAG_SHIFT,
  shouldExpandOnDrag,
} from './pane-expand-model.js';

describe('the pane expand drag', () => {
  it('opens when dragged toward the centre far enough', () => {
    assert.equal(
      shouldExpandOnDrag({ dx: -EXPAND_DRAG_DISTANCE, dy: 0 }),
      true,
    );
    assert.equal(shouldExpandOnDrag({ dx: -90, dy: 10 }), true);
  });

  it('does not open for a short drag', () => {
    assert.equal(
      shouldExpandOnDrag({ dx: -EXPAND_DRAG_DISTANCE + 1, dy: 0 }),
      false,
    );
  });

  it('does not open for an outward or mostly vertical drag', () => {
    assert.equal(shouldExpandOnDrag({ dx: 120, dy: 0 }), false);
    assert.equal(shouldExpandOnDrag({ dx: -60, dy: -200 }), false);
    assert.equal(shouldExpandOnDrag({ dx: 0, dy: -90 }), false);
  });

  it('follows the finger closely at first', () => {
    const shift = dragShiftOffset({ dx: -10, dy: 0 });

    assert.ok(shift < 0 && shift <= -9, `shift was ${shift}`);
  });

  it('keeps moving the further the finger goes, but never past the cap', () => {
    const shifts = [-20, -60, -120, -400, -4000].map((dx) =>
      dragShiftOffset({ dx, dy: 0 }),
    );

    shifts.forEach((shift, index) => {
      assert.ok(shift > -MAX_DRAG_SHIFT, `shift ${shift} reached the cap`);

      if (index > 0) {
        assert.ok(shift < shifts[index - 1], 'the pane stopped following');
      }
    });
  });

  it('has moved well past the open distance by the time it opens', () => {
    assert.ok(
      -dragShiftOffset({ dx: -EXPAND_DRAG_DISTANCE, dy: 0 }) >
        EXPAND_DRAG_DISTANCE / 2,
    );
  });

  it('does not shift for an outward or vertical drag', () => {
    assert.equal(dragShiftOffset({ dx: 40, dy: 0 }), 0);
    assert.equal(dragShiftOffset({ dx: -20, dy: -90 }), 0);
  });

  it('tells a drag from a tap by a few points of movement', () => {
    assert.equal(isDrag({ dx: 1, dy: 2 }), false);
    assert.equal(isDrag({ dx: 10, dy: 0 }), true);
  });
});

describe('which pointers start a pane drag', () => {
  it('accepts the main button and the first finger', () => {
    assert.equal(canStartPaneDrag({ button: 0, isPrimary: true }), true);
  });

  it('ignores other mouse buttons and extra fingers', () => {
    assert.equal(canStartPaneDrag({ button: 2, isPrimary: true }), false);
    assert.equal(canStartPaneDrag({ button: 1, isPrimary: true }), false);
    assert.equal(canStartPaneDrag({ button: 0, isPrimary: false }), false);
  });
});
