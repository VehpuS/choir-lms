import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  clearTrackReveal,
  registerRevealScroller,
  requestTrackReveal,
  scrollLibraryToWindowY,
} from './track-reveal-store';

describe('track reveal store', () => {
  afterEach(() => {
    // Drop any request a test left behind (ids only grow, so clear by value).
    for (let id = 1; id < 50; id += 1) {
      clearTrackReveal(id);
    }
  });

  it('forwards the scroll to the registered scroller until it unregisters', () => {
    const seen: number[] = [];
    const unregister = registerRevealScroller((y) => seen.push(y));

    scrollLibraryToWindowY(120);
    unregister();
    scrollLibraryToWindowY(240);

    assert.deepEqual(seen, [120]);
  });

  it('keeps a newer scroller when an older one unregisters late', () => {
    const seen: string[] = [];
    const unregisterOld = registerRevealScroller(() => seen.push('old'));
    registerRevealScroller(() => seen.push('new'))();
    const unregisterNew = registerRevealScroller(() => seen.push('new2'));

    unregisterOld();
    scrollLibraryToWindowY(1);
    unregisterNew();

    assert.deepEqual(seen, ['new2']);
  });

  it('accepts repeated requests for the same track', () => {
    assert.doesNotThrow(() => {
      requestTrackReveal('t1');
      requestTrackReveal('t1');
    });
  });
});
