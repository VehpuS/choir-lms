import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PIANO_STRIP_WIDTH } from './keyboard-layout.js';
import {
  clampScrollLeft,
  mapWindow,
  PIANO_HANDLE_HEIGHT,
  pianoOverlayHeight,
  scrollLeftFromMapX,
  snapHeightStep,
} from './piano-overlay-model.js';

describe('overlay height', () => {
  it('shrinks to the handle when collapsed', () => {
    assert.equal(pianoOverlayHeight('tall', true), PIANO_HANDLE_HEIGHT);
  });

  it('grows with the step', () => {
    assert.ok(
      pianoOverlayHeight('compact', false) <
        pianoOverlayHeight('regular', false),
    );
    assert.ok(
      pianoOverlayHeight('regular', false) < pianoOverlayHeight('tall', false),
    );
  });
});

describe('handle snapping', () => {
  // The drag is the screen delta, so dragging up is negative.
  it('snaps up past the midpoint to the next step', () => {
    // Regular is 136 and tall is 184, so the midpoint is 160: 25 up crosses it.
    assert.equal(snapHeightStep('regular', -25), 'tall');
    assert.equal(snapHeightStep('regular', -23), 'regular');
  });

  it('snaps down and stays within the steps', () => {
    assert.equal(snapHeightStep('regular', 30), 'compact');
    assert.equal(snapHeightStep('tall', -500), 'tall');
    assert.equal(snapHeightStep('compact', 500), 'compact');
  });

  it('can skip a step on a long drag', () => {
    assert.equal(snapHeightStep('compact', -100), 'tall');
  });
});

describe('scrolling', () => {
  const viewport = 400;

  it('clamps to the strip', () => {
    assert.equal(clampScrollLeft(-10, viewport), 0);
    assert.equal(
      clampScrollLeft(99999, viewport),
      PIANO_STRIP_WIDTH - viewport,
    );
    assert.equal(clampScrollLeft(50, PIANO_STRIP_WIDTH + 1), 0);
  });

  it('centres the window on a minimap touch', () => {
    const mapWidth = 300;
    const middle = scrollLeftFromMapX(mapWidth / 2, mapWidth, viewport);

    assert.equal(middle, PIANO_STRIP_WIDTH / 2 - viewport / 2);
    assert.equal(scrollLeftFromMapX(0, mapWidth, viewport), 0);
    assert.equal(
      scrollLeftFromMapX(mapWidth, mapWidth, viewport),
      PIANO_STRIP_WIDTH - viewport,
    );
    assert.equal(scrollLeftFromMapX(10, 0, viewport), 0);
  });

  it('describes the visible window as fractions', () => {
    const { left, width } = mapWindow(PIANO_STRIP_WIDTH / 2, viewport);

    assert.ok(Math.abs(width - viewport / PIANO_STRIP_WIDTH) < 1e-9);
    assert.ok(left > 0 && left < 1);
    assert.equal(mapWindow(0, PIANO_STRIP_WIDTH * 2).width, 1);
  });
});
