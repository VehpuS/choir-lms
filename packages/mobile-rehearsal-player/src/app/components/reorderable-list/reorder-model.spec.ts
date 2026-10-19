import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MIN_DRAG_STEP_DISTANCE,
  advanceDrag,
  moveItem,
  resolveDragStepDistance,
} from './reorder-model';

describe('resolveDragStepDistance', () => {
  it('follows the row height but never drops below a thumb-sized step', () => {
    assert.equal(resolveDragStepDistance(100), 82);
    assert.equal(resolveDragStepDistance(20), MIN_DRAG_STEP_DISTANCE);
  });
});

describe('advanceDrag', () => {
  const base = { anchor: 100, index: 1, itemCount: 4, stepDistance: 50 };

  it('moves nothing until the drag covers a step', () => {
    assert.deepEqual(advanceDrag({ ...base, y: 140 }), {
      anchor: 100,
      moves: [],
    });
  });

  it('moves one slot per step travelled and carries the anchor forward', () => {
    assert.deepEqual(advanceDrag({ ...base, y: 210 }), {
      anchor: 200,
      moves: [
        { from: 1, to: 2 },
        { from: 2, to: 3 },
      ],
    });
  });

  it('moves upward for a drag above the anchor', () => {
    assert.deepEqual(advanceDrag({ ...base, y: 50 }).moves, [
      { from: 1, to: 0 },
    ]);
  });

  it('stops at the ends of the list', () => {
    assert.deepEqual(advanceDrag({ ...base, index: 3, y: 400 }).moves, []);
    assert.deepEqual(advanceDrag({ ...base, index: 0, y: -300 }).moves, []);
  });

  it('does nothing for an item that is no longer in the list', () => {
    assert.deepEqual(advanceDrag({ ...base, index: -1, y: 400 }).moves, []);
  });
});

describe('moveItem', () => {
  it('moves an item without changing the original', () => {
    const items = ['a', 'b', 'c'];

    assert.deepEqual(moveItem(items, 0, 2), ['b', 'c', 'a']);
    assert.deepEqual(moveItem(items, 2, 0), ['c', 'a', 'b']);
    assert.deepEqual(items, ['a', 'b', 'c']);
  });

  it('leaves the order alone for a no-op or out-of-range move', () => {
    assert.deepEqual(moveItem(['a', 'b'], 1, 1), ['a', 'b']);
    assert.deepEqual(moveItem(['a', 'b'], 0, 5), ['a', 'b']);
    assert.deepEqual(moveItem(['a', 'b'], -1, 0), ['a', 'b']);
  });
});
