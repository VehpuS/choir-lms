import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldResetPageScroll } from './model.js';

const rest = { isEditing: false, scrollX: 0, scrollY: 0 };

describe('putting a scrolled page back', () => {
  it('leaves a page at rest alone', () => {
    assert.equal(shouldResetPageScroll(rest), false);
  });

  it('ignores sub-point rounding', () => {
    assert.equal(shouldResetPageScroll({ ...rest, scrollY: 0.3 }), false);
  });

  it('resets a page scrolled down, sideways, or pulled past the top', () => {
    assert.equal(shouldResetPageScroll({ ...rest, scrollY: 40 }), true);
    assert.equal(shouldResetPageScroll({ ...rest, scrollX: 12 }), true);
    assert.equal(shouldResetPageScroll({ ...rest, scrollY: -30 }), true);
  });

  it('leaves the page alone while a text field has focus', () => {
    assert.equal(
      shouldResetPageScroll({ isEditing: true, scrollX: 0, scrollY: 40 }),
      false,
    );
  });
});
