import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getKeyboardInset } from './keyboard-inset-model.js';

const reading = (
  overrides: Partial<Parameters<typeof getKeyboardInset>[0]>,
) => ({
  layoutHeight: 390,
  offsetTop: 0,
  scale: 1,
  visualHeight: 390,
  ...overrides,
});

describe('getKeyboardInset', () => {
  it('is zero while the visual viewport fills the layout viewport', () => {
    assert.equal(getKeyboardInset(reading({})), 0);
  });

  it('is the missing height when a keyboard shrinks the visual viewport', () => {
    assert.equal(getKeyboardInset(reading({ visualHeight: 220 })), 170);
  });

  it('ignores the small shortfall of the browser toolbar', () => {
    assert.equal(getKeyboardInset(reading({ visualHeight: 320 })), 0);
  });

  it('does not count a page scrolled inside the layout viewport as keyboard', () => {
    // The visual viewport slid down 170 points with the same height: no keyboard.
    assert.equal(
      getKeyboardInset(reading({ offsetTop: 170, visualHeight: 220 })),
      0,
    );
  });

  it('is zero while the page is pinch zoomed', () => {
    assert.equal(getKeyboardInset(reading({ scale: 2, visualHeight: 195 })), 0);
  });

  it('rounds a fractional height', () => {
    assert.equal(getKeyboardInset(reading({ visualHeight: 219.6 })), 170);
  });
});
