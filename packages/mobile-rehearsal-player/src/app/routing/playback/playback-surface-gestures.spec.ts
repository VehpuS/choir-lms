/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldStartPlaybackSurfaceDismissGesture } from './playback-surface-gestures.js';

describe('playback surface gestures', () => {
  it('starts a dismiss gesture when a downward drag begins near the handle', () => {
    assert.equal(
      shouldStartPlaybackSurfaceDismissGesture({
        dx: 2,
        dy: 18,
        locationY: 48,
      }),
      true,
    );
  });

  it('ignores downward drags that begin inside scrollable sheet content', () => {
    assert.equal(
      shouldStartPlaybackSurfaceDismissGesture({
        dx: 1,
        dy: 24,
        locationY: 220,
      }),
      false,
    );
  });

  it('ignores gestures that are mostly horizontal', () => {
    assert.equal(
      shouldStartPlaybackSurfaceDismissGesture({
        dx: 22,
        dy: 10,
        locationY: 40,
      }),
      false,
    );
  });
});
