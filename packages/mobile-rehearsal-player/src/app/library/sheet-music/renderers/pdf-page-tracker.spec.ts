import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PdfPageRange } from './pdf-layout-model.js';
import { createPageTracker } from './pdf-page-tracker.js';

const one = (page: number): PdfPageRange => ({ first: page, last: page });

const setUp = (options: { initialPage?: number } = {}) => {
  let range = one(options.initialPage ?? 0);
  const listeners = new Set<() => void>();
  const frames: Array<() => void> = [];
  const changes: PdfPageRange[] = [];
  const host = {
    addEventListener: (_type: 'scroll', listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_type: 'scroll', listener: () => void) =>
      listeners.delete(listener),
  };
  const tracker = createPageTracker({
    host,
    onChange: (next) => changes.push(next),
    rangeOf: () => range,
    requestFrame: (callback) => frames.push(callback),
  });

  return {
    changes,
    listeners,
    runFrame: () => frames.splice(0).forEach((frame) => frame()),
    scroll: () => listeners.forEach((listener) => listener()),
    setPage: (next: number) => {
      range = one(next);
    },
    setRange: (next: PdfPageRange) => {
      range = next;
    },
    tracker,
  };
};

describe('createPageTracker', () => {
  it('reports a new page on the next frame after scrolling', () => {
    const { changes, runFrame, scroll, setPage } = setUp();

    setPage(3);
    scroll();
    assert.deepEqual(changes, []);

    runFrame();
    assert.deepEqual(changes, [one(3)]);
  });

  it('reads the position once per frame however many scroll events arrive', () => {
    let reads = 0;
    const listeners = new Set<() => void>();
    const frames: Array<() => void> = [];
    const tracker = createPageTracker({
      host: {
        addEventListener: (_type, listener) => listeners.add(listener),
        removeEventListener: (_type, listener) => listeners.delete(listener),
      },
      rangeOf: () => {
        reads += 1;

        return one(0);
      },
      requestFrame: (callback) => frames.push(callback),
    });
    const readsAtStart = reads;

    for (let event = 0; event < 20; event += 1) {
      listeners.forEach((listener) => listener());
    }

    frames.splice(0).forEach((frame) => frame());

    assert.equal(frames.length, 0);
    assert.equal(reads - readsAtStart, 1);
    tracker.dispose();
  });

  it('reports a change in the last page in view alone', () => {
    const { changes, setRange, tracker } = setUp();

    setRange({ first: 0, last: 2 });
    tracker.check();
    setRange({ first: 0, last: 2 });
    tracker.check();
    setRange({ first: 0, last: 3 });
    tracker.check();

    assert.deepEqual(changes, [
      { first: 0, last: 2 },
      { first: 0, last: 3 },
    ]);
  });

  it('stays quiet while the page does not change', () => {
    const { changes, runFrame, scroll } = setUp({ initialPage: 2 });

    scroll();
    runFrame();

    assert.deepEqual(changes, []);
  });

  it('reports a change found by check without a scroll event', () => {
    const { changes, setPage, tracker } = setUp();

    setPage(5);
    tracker.check();
    tracker.check();

    assert.deepEqual(changes, [one(5)]);
  });

  it('stops listening and reporting once disposed', () => {
    const { changes, listeners, runFrame, scroll, setPage, tracker } = setUp();

    setPage(1);
    scroll();
    tracker.dispose();
    runFrame();
    tracker.check();

    assert.equal(listeners.size, 0);
    assert.deepEqual(changes, []);
  });
});
