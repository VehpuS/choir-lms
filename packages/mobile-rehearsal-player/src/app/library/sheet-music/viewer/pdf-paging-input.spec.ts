import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  INITIAL_WHEEL_TURN_STATE,
  accumulateWheelTurn,
  isSidewaysWheel,
  pageKeyStep,
  wheelDeltaPixels,
} from './pdf-paging-input.js';

describe('pageKeyStep', () => {
  it('turns forward on the right arrow and Page Down, back on the left arrow and Page Up', () => {
    for (const layout of ['pages', 'strip'] as const) {
      assert.equal(pageKeyStep({ key: 'ArrowRight' }, layout), 1);
      assert.equal(pageKeyStep({ key: 'PageDown' }, layout), 1);
      assert.equal(pageKeyStep({ key: 'ArrowLeft' }, layout), -1);
      assert.equal(pageKeyStep({ key: 'PageUp' }, layout), -1);
    }
  });

  it('leaves every key to the browser in scroll', () => {
    for (const key of ['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp']) {
      assert.equal(pageKeyStep({ key }, 'scroll'), 0);
    }
  });

  it('ignores other keys, shortcuts, and typing in a text field', () => {
    assert.equal(pageKeyStep({ key: 'ArrowDown' }, 'pages'), 0);
    assert.equal(pageKeyStep({ key: 'a' }, 'pages'), 0);
    assert.equal(pageKeyStep({ ctrlKey: true, key: 'ArrowRight' }, 'pages'), 0);
    assert.equal(pageKeyStep({ metaKey: true, key: 'ArrowLeft' }, 'strip'), 0);
    assert.equal(pageKeyStep({ altKey: true, key: 'ArrowLeft' }, 'strip'), 0);
    assert.equal(
      pageKeyStep({ isFromEditableTarget: true, key: 'ArrowRight' }, 'pages'),
      0,
    );
  });
});

describe('isSidewaysWheel', () => {
  it('moves strip and pages sideways for a plain vertical wheel at fitted zoom', () => {
    assert.equal(isSidewaysWheel({ deltaY: 100 }, 'strip', 1), true);
    assert.equal(isSidewaysWheel({ deltaY: -100 }, 'pages', 1), true);
    assert.equal(isSidewaysWheel({ deltaY: 100 }, 'pages', 0.5), true);
  });

  it('leaves scroll alone', () => {
    assert.equal(isSidewaysWheel({ deltaY: 100 }, 'scroll', 1), false);
  });

  it('leaves a zoomed-in page to scroll vertically', () => {
    assert.equal(isSidewaysWheel({ deltaY: 100 }, 'strip', 1.5), false);
  });

  it('leaves zoom, and a sideways trackpad swipe, to their own handling', () => {
    assert.equal(
      isSidewaysWheel({ ctrlKey: true, deltaY: 100 }, 'pages', 1),
      false,
    );
    assert.equal(
      isSidewaysWheel({ metaKey: true, deltaY: 100 }, 'pages', 1),
      false,
    );
    assert.equal(
      isSidewaysWheel({ deltaX: 80, deltaY: 10 }, 'strip', 1),
      false,
    );
    assert.equal(isSidewaysWheel({ deltaY: 0 }, 'strip', 1), false);
  });
});

describe('wheelDeltaPixels', () => {
  it('reads pixels as they are, lines as 16 pixels, and pages as a viewport width', () => {
    assert.equal(wheelDeltaPixels({ deltaMode: 0, deltaY: 40 }, 500), 40);
    assert.equal(wheelDeltaPixels({ deltaMode: 1, deltaY: 3 }, 500), 48);
    assert.equal(wheelDeltaPixels({ deltaMode: 2, deltaY: 1 }, 500), 500);
  });
});

describe('accumulateWheelTurn', () => {
  it('turns one page once a notch or two has added up', () => {
    const first = accumulateWheelTurn(INITIAL_WHEEL_TURN_STATE, 30, 0);
    const second = accumulateWheelTurn(first.state, 30, 50);

    assert.equal(first.step, 0);
    assert.equal(second.step, 1);
  });

  it('turns back for a wheel the other way', () => {
    assert.equal(
      accumulateWheelTurn(INITIAL_WHEEL_TURN_STATE, -120, 0).step,
      -1,
    );
  });

  it('turns only one page for a flick that keeps coming', () => {
    let state = INITIAL_WHEEL_TURN_STATE;
    const steps: number[] = [];

    for (let time = 0; time < 300; time += 20) {
      const result = accumulateWheelTurn(state, 120, time);

      state = result.state;
      steps.push(result.step);
    }

    assert.deepEqual(
      steps.filter((step) => step !== 0),
      [1],
    );
  });

  it('turns again once the lock has passed', () => {
    const turned = accumulateWheelTurn(INITIAL_WHEEL_TURN_STATE, 120, 0);
    const later = accumulateWheelTurn(turned.state, 120, 1000);

    assert.equal(later.step, 1);
  });

  it('forgets a slow leftover after a pause', () => {
    const slow = accumulateWheelTurn(INITIAL_WHEEL_TURN_STATE, 40, 0);
    const afterPause = accumulateWheelTurn(slow.state, 40, 1000);

    assert.equal(afterPause.step, 0);
  });
});
