import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  COMPACT_VIEWER_MAX_HEIGHT,
  isCompactViewerHeight,
  resolveCompactViewer,
} from './layout-model.js';

describe('isCompactViewerHeight', () => {
  it('is compact for a phone held sideways', () => {
    for (const height of [320, 375, 390, 430]) {
      assert.equal(isCompactViewerHeight(height), true, `${height}`);
    }
  });

  it('keeps the roomy layout for an upright phone and a tablet in either orientation', () => {
    for (const height of [667, 812, 768, 1024, 834]) {
      assert.equal(isCompactViewerHeight(height), false, `${height}`);
    }
  });

  it('switches exactly at the limit', () => {
    assert.equal(isCompactViewerHeight(COMPACT_VIEWER_MAX_HEIGHT - 1), true);
    assert.equal(isCompactViewerHeight(COMPACT_VIEWER_MAX_HEIGHT), false);
  });
});

describe('resolveCompactViewer', () => {
  it('follows the window height while no text field has focus', () => {
    assert.equal(
      resolveCompactViewer({
        isTyping: false,
        previous: false,
        windowHeight: 400,
      }),
      true,
    );
    assert.equal(
      resolveCompactViewer({
        isTyping: false,
        previous: true,
        windowHeight: 812,
      }),
      false,
    );
  });

  it('holds an upright phone in the roomy layout while the keyboard is up', () => {
    // The soft keyboard cuts an 812 pt window to about 400.
    assert.equal(
      resolveCompactViewer({
        isTyping: true,
        previous: false,
        windowHeight: 400,
      }),
      false,
    );
  });

  it('holds a sideways phone in the compact layout while typing', () => {
    assert.equal(
      resolveCompactViewer({
        isTyping: true,
        previous: true,
        windowHeight: 600,
      }),
      true,
    );
  });
});
