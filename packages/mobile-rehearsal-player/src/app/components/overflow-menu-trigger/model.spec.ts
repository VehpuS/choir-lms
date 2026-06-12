import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  OVERFLOW_MENU_TRIGGER_HIT_SLOP,
  OVERFLOW_MENU_TRIGGER_ICON_SIZE,
  OVERFLOW_MENU_TRIGGER_MIN_HEIGHT,
  OVERFLOW_MENU_TRIGGER_MIN_WIDTH,
  OVERFLOW_MENU_TRIGGER_RIGHT,
  OVERFLOW_MENU_TRIGGER_TOP,
  getOverflowMenuTriggerAccessibilityState,
  getOverflowMenuTriggerVisualState,
} from './model.js';

describe('OverflowMenuTrigger', () => {
  it('returns a stable accessibility state for enabled and disabled triggers', () => {
    assert.deepEqual(getOverflowMenuTriggerAccessibilityState(false), {
      disabled: false,
    });
    assert.deepEqual(getOverflowMenuTriggerAccessibilityState(true), {
      disabled: true,
    });
  });

  it('keeps pressed feedback off while disabled and preserves shared layout tokens', () => {
    assert.deepEqual(
      getOverflowMenuTriggerVisualState({
        disabled: false,
        pressed: true,
      }),
      {
        disabled: false,
        pressed: true,
      },
    );
    assert.deepEqual(
      getOverflowMenuTriggerVisualState({
        disabled: true,
        pressed: true,
      }),
      {
        disabled: true,
        pressed: false,
      },
    );

    assert.equal(OVERFLOW_MENU_TRIGGER_TOP, 10);
    assert.equal(OVERFLOW_MENU_TRIGGER_RIGHT, 10);
    assert.equal(OVERFLOW_MENU_TRIGGER_MIN_WIDTH, 44);
    assert.equal(OVERFLOW_MENU_TRIGGER_MIN_HEIGHT, 36);
    assert.equal(OVERFLOW_MENU_TRIGGER_HIT_SLOP, 4);
    assert.equal(OVERFLOW_MENU_TRIGGER_ICON_SIZE, 18);
  });
});
