import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  dragLiftOffset,
  EXPAND_DRAG_DISTANCE,
  isDrag,
  MAX_DRAG_LIFT,
  shouldExpandOnDrag,
} from './pane-expand-model.js';

describe('the pane expand drag', () => {
  it('opens when dragged up far enough', () => {
    assert.equal(
      shouldExpandOnDrag({ dx: 0, dy: -EXPAND_DRAG_DISTANCE }),
      true,
    );
    assert.equal(shouldExpandOnDrag({ dx: 10, dy: -90 }), true);
  });

  it('does not open for a short drag', () => {
    assert.equal(
      shouldExpandOnDrag({ dx: 0, dy: -EXPAND_DRAG_DISTANCE + 1 }),
      false,
    );
  });

  it('does not open for a downward or mostly sideways drag', () => {
    assert.equal(shouldExpandOnDrag({ dx: 0, dy: 120 }), false);
    assert.equal(shouldExpandOnDrag({ dx: 200, dy: -60 }), false);
  });

  it('lifts the content with the finger, up to a cap', () => {
    assert.equal(dragLiftOffset({ dx: 0, dy: -10 }), -10);
    assert.equal(dragLiftOffset({ dx: 0, dy: -200 }), -MAX_DRAG_LIFT);
  });

  it('does not lift for a downward or sideways drag', () => {
    assert.equal(dragLiftOffset({ dx: 0, dy: 40 }), 0);
    assert.equal(dragLiftOffset({ dx: 90, dy: -20 }), 0);
  });

  it('tells a drag from a tap by a few points of movement', () => {
    assert.equal(isDrag({ dx: 1, dy: 2 }), false);
    assert.equal(isDrag({ dx: 0, dy: 10 }), true);
  });
});
