import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPageTracker } from './pdf-page-tracker.js';

const setUp = (options: { initialPage?: number } = {}) => {
  let page = options.initialPage ?? 0;
  const listeners = new Set<() => void>();
  const frames: Array<() => void> = [];
  const changes: number[] = [];
  const host = {
    addEventListener: (_type: 'scroll', listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_type: 'scroll', listener: () => void) =>
      listeners.delete(listener),
  };
  const tracker = createPageTracker({
    host,
    onChange: (next) => changes.push(next),
    pageOf: () => page,
    requestFrame: (callback) => frames.push(callback),
  });

  return {
    changes,
    listeners,
    runFrame: () => frames.splice(0).forEach((frame) => frame()),
    scroll: () => listeners.forEach((listener) => listener()),
    setPage: (next: number) => {
      page = next;
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
    assert.deepEqual(changes, [3]);
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
      pageOf: () => {
        reads += 1;

        return 0;
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

    assert.deepEqual(changes, [5]);
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
