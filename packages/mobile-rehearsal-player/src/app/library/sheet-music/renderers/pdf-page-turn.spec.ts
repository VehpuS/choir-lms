import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import {
  SMOOTH_TURN_SETTLE_MS,
  createPdfPageTurner,
  shouldAnimateTurn,
} from './pdf-page-turn.js';

describe('shouldAnimateTurn', () => {
  it('slides only when asked to and motion is allowed', () => {
    assert.equal(shouldAnimateTurn(true, false), true);
    assert.equal(shouldAnimateTurn(true, true), false);
    assert.equal(shouldAnimateTurn(false, false), false);
  });
});

describe('createPdfPageTurner', () => {
  // Fake timers keep the settle delay deterministic without waiting.
  beforeEach(() => mock.timers.enable({ apis: ['setTimeout'] }));
  afterEach(() => mock.timers.reset());

  const setUp = (prefersReducedMotion = false) => {
    const snapping: boolean[] = [];
    const slides: { left: number; top: number }[] = [];
    const host = {
      scrollLeft: 0,
      scrollTo: (target: { left: number; top: number }) => slides.push(target),
      scrollTop: 0,
    };
    const turner = createPdfPageTurner({
      host,
      prefersReducedMotion: () => prefersReducedMotion,
      setSnapping: (isOn) => snapping.push(isOn),
    });

    return { host, slides, snapping, turner };
  };

  it('slides, suspends snapping, and restores it after the settle delay', () => {
    const { host, slides, snapping, turner } = setUp();

    turner.turn({ animate: true, index: 3, left: 900, top: 0 });

    assert.deepEqual(slides, [{ behavior: 'smooth', left: 900, top: 0 }]);
    assert.deepEqual(snapping, [false]);
    assert.equal(turner.pendingPage(), 3);

    mock.timers.tick(SMOOTH_TURN_SETTLE_MS);

    assert.deepEqual(snapping, [false, true]);
    assert.equal(turner.pendingPage(), undefined);
    assert.equal(host.scrollLeft, 900);
  });

  it('puts a stalled slide on its target before snapping returns', () => {
    const { host, snapping, turner } = setUp();

    // The fake host never moves on a slide, as in a page that is not painting.
    turner.turn({ animate: true, index: 2, left: 600, top: 0 });
    assert.equal(host.scrollLeft, 0);

    mock.timers.tick(SMOOTH_TURN_SETTLE_MS);

    assert.equal(host.scrollLeft, 600);
    assert.deepEqual(snapping, [false, true]);
  });

  it('moves at once under reduced motion', () => {
    const { host, slides, snapping, turner } = setUp(true);

    turner.turn({ animate: true, index: 3, left: 900, top: 20 });

    assert.equal(host.scrollLeft, 900);
    assert.equal(host.scrollTop, 20);
    assert.deepEqual(slides, []);
    assert.deepEqual(snapping, []);
  });

  it('moves at once when the turn did not ask to slide', () => {
    const { host, slides, turner } = setUp();

    turner.turn({ animate: false, index: 2, left: 600, top: 0 });

    assert.equal(host.scrollLeft, 600);
    assert.deepEqual(slides, []);
  });

  it('ends repeated turns at the newest target with one restore', () => {
    const { slides, snapping, turner } = setUp();

    turner.turn({ animate: true, index: 1, left: 300, top: 0 });
    mock.timers.tick(SMOOTH_TURN_SETTLE_MS / 2);
    turner.turn({ animate: true, index: 2, left: 600, top: 0 });
    mock.timers.tick(SMOOTH_TURN_SETTLE_MS / 2);
    turner.turn({ animate: true, index: 3, left: 900, top: 0 });

    assert.equal(turner.pendingPage(), 3);
    assert.equal(slides.at(-1)?.left, 900);

    mock.timers.tick(SMOOTH_TURN_SETTLE_MS);

    assert.equal(turner.pendingPage(), undefined);
    assert.equal(snapping.filter((isOn) => isOn).length, 1);
  });

  it('lets an instant move cut a slide short and restore snapping', () => {
    const { host, snapping, turner } = setUp();

    turner.turn({ animate: true, index: 4, left: 1200, top: 0 });
    turner.turn({ animate: false, index: 0, left: 0, top: 0 });

    assert.equal(host.scrollLeft, 0);
    assert.equal(turner.pendingPage(), undefined);
    assert.deepEqual(snapping, [false, true]);
  });
});
