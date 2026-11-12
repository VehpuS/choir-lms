import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { createBackStack } from './back-stack';

// A fake browser history: `go` is asynchronous like the real one, so a test
// settles it with `settle()` (which fires the popstate the browser would).
const createFakeBrowser = () => {
  const entries = ['base'];
  let position = 0;
  let listener: (() => void) | null = null;
  const queuedTraversals: number[] = [];

  return {
    environment: {
      history: {
        go: (delta: number) => {
          queuedTraversals.push(delta);
        },
        pushState: () => {
          entries.splice(position + 1);
          entries.push('overlay');
          position += 1;
        },
      },
      target: {
        addEventListener: (_type: 'popstate', next: () => void) => {
          listener = next;
        },
      },
    },
    /** The person presses Back. */
    back: () => {
      position -= 1;
      listener?.();
    },
    /** Runs the traversals the stack asked for. */
    settle: () => {
      while (queuedTraversals.length > 0) {
        position += queuedTraversals.shift() ?? 0;
        listener?.();
      }
    },
    get depth() {
      return position;
    },
  };
};

describe('createBackStack', () => {
  let browser: ReturnType<typeof createFakeBrowser>;
  let stack: ReturnType<typeof createBackStack>;
  let dismissed: string[];

  beforeEach(() => {
    browser = createFakeBrowser();
    stack = createBackStack(browser.environment);
    dismissed = [];
  });

  it('adds one history entry per open layer', () => {
    stack.push(() => dismissed.push('sheet'));
    stack.push(() => dismissed.push('menu'));

    assert.equal(browser.depth, 2);
  });

  it('closes only the topmost layer on Back', () => {
    stack.push(() => dismissed.push('sheet'));
    stack.push(() => dismissed.push('menu'));

    browser.back();

    assert.deepEqual(dismissed, ['menu']);
    assert.equal(browser.depth, 1);
  });

  it('closes the next layer on a second Back', () => {
    stack.push(() => dismissed.push('sheet'));
    stack.push(() => dismissed.push('menu'));

    browser.back();
    browser.back();

    assert.deepEqual(dismissed, ['menu', 'sheet']);
    assert.equal(browser.depth, 0);
  });

  it('does not give a second entry back when Back itself closed the layer', () => {
    const release = stack.push(() => dismissed.push('sheet'));

    browser.back();
    release();
    browser.settle();

    assert.equal(browser.depth, 0);
  });

  it('gives the entry back when a layer is closed another way, without dismissing', () => {
    const release = stack.push(() => dismissed.push('sheet'));

    release();
    browser.settle();

    assert.deepEqual(dismissed, []);
    assert.equal(browser.depth, 0);
  });

  it('keeps a layer closed out of order until the layers above it are gone', () => {
    const releaseSheet = stack.push(() => dismissed.push('sheet'));
    const releaseMenu = stack.push(() => dismissed.push('menu'));

    releaseSheet();
    browser.settle();
    assert.equal(browser.depth, 2);

    releaseMenu();
    browser.settle();
    assert.equal(browser.depth, 0);
    assert.deepEqual(dismissed, []);
  });

  it('waits for a pending traversal before pushing for a layer opened right after one closed', () => {
    const releaseSheet = stack.push(() => dismissed.push('sheet'));

    releaseSheet();
    stack.push(() => dismissed.push('next'));
    assert.equal(browser.depth, 1, 'pushed while a traversal was pending');

    browser.settle();
    assert.equal(browser.depth, 1);

    browser.back();
    assert.deepEqual(dismissed, ['next']);
    assert.equal(browser.depth, 0);
  });

  it('ignores a Back with no layer open', () => {
    stack.push(() => dismissed.push('sheet'));
    browser.back();
    browser.back();

    assert.deepEqual(dismissed, ['sheet']);
  });
});
