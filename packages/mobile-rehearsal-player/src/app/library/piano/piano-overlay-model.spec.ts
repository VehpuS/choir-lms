import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createKeyboardLayout, PIANO_STRIP_WIDTH } from './keyboard-layout.js';
import {
  capHeightStep,
  clampScrollLeft,
  mapWindow,
  octaveTicks,
  PIANO_HANDLE_HEIGHT,
  PIANO_SCROLL_STRIP_HEIGHT,
  pianoOverlayHeight,
  scrollLeftFromMapX,
  snapHeightStep,
} from './piano-overlay-model.js';

describe('overlay height', () => {
  it('is the handle row, the keys, and the minimap', () => {
    assert.equal(
      pianoOverlayHeight('compact'),
      PIANO_HANDLE_HEIGHT + 96 + PIANO_SCROLL_STRIP_HEIGHT,
    );
  });

  it('grows with the step', () => {
    assert.ok(pianoOverlayHeight('compact') < pianoOverlayHeight('regular'));
    assert.ok(pianoOverlayHeight('regular') < pianoOverlayHeight('tall'));
  });
});

describe('height cap', () => {
  it('lowers a taller stored step to the limit and leaves others alone', () => {
    assert.equal(capHeightStep('tall', 'compact'), 'compact');
    assert.equal(capHeightStep('regular', 'compact'), 'compact');
    assert.equal(capHeightStep('compact', 'regular'), 'compact');
    assert.equal(capHeightStep('regular', 'regular'), 'regular');
  });

  it('does nothing without a limit', () => {
    assert.equal(capHeightStep('tall', undefined), 'tall');
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

describe('scrolling at a wider key width', () => {
  const viewport = 400;
  const wideStrip = createKeyboardLayout(80).stripWidth;

  it('clamps to the wider strip', () => {
    assert.equal(
      clampScrollLeft(99999, viewport, wideStrip),
      wideStrip - viewport,
    );
    assert.equal(clampScrollLeft(50, wideStrip + 1, wideStrip), 0);
  });

  it('maps a minimap touch onto the wider strip', () => {
    assert.equal(
      scrollLeftFromMapX(150, 300, viewport, wideStrip),
      wideStrip / 2 - viewport / 2,
    );
  });

  it('shows a narrower window on the minimap as the strip grows', () => {
    const { width } = mapWindow(0, viewport, wideStrip);

    assert.ok(Math.abs(width - viewport / wideStrip) < 1e-9);
    assert.ok(width < mapWindow(0, viewport).width);
  });
});

describe('octave ticks', () => {
  it('labels every C from C1 to C8 in pitch order', () => {
    assert.deepEqual(
      octaveTicks().map((tick) => tick.label),
      ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'],
    );
  });

  it('places them inside the strip, increasing, with C8 at the far end', () => {
    const positions = octaveTicks().map((tick) => tick.position);

    assert.ok(positions.every((position) => position > 0 && position < 1));
    assert.deepEqual(
      positions,
      [...positions].sort((a, b) => a - b),
    );
    assert.ok(positions[positions.length - 1] > 0.98);
  });

  it('puts middle C at the same place whatever the key width', () => {
    const wide = createKeyboardLayout(100);
    const middleC = wide.keys.find((key) => key.midi === 60);
    const tick = octaveTicks().find((candidate) => candidate.label === 'C4');

    assert.ok(middleC && tick);
    assert.ok(
      Math.abs(
        (middleC.left + middleC.width / 2) / wide.stripWidth - tick.position,
      ) < 1e-9,
    );
  });
});
