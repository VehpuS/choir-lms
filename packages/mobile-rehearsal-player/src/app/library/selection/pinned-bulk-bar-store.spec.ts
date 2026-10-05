/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPinnedBulkBarStore } from './pinned-bulk-bar-store.js';

const bar = (overflowTitle: string) => ({ actions: [], overflowTitle });

describe('pinned bulk bar store', () => {
  it('publishes the latest bar to subscribers and withdraws it with null', () => {
    const store = createPinnedBulkBarStore();
    const seen: (string | null)[] = [];

    store.subscribe(() => {
      seen.push(store.getSnapshot()?.overflowTitle ?? null);
    });
    store.set(bar('2 selected'));
    store.set(bar('3 selected'));
    store.set(null);

    assert.deepEqual(seen, ['2 selected', '3 selected', null]);
  });

  it('does not notify when the same props are set again', () => {
    const store = createPinnedBulkBarStore();
    const props = bar('1 selected');
    let notifications = 0;

    store.subscribe(() => {
      notifications += 1;
    });
    store.set(props);
    store.set(props);

    assert.equal(notifications, 1);
  });

  it('stops notifying after unsubscribe', () => {
    const store = createPinnedBulkBarStore();
    let notifications = 0;
    const unsubscribe = store.subscribe(() => {
      notifications += 1;
    });

    unsubscribe();
    store.set(bar('1 selected'));

    assert.equal(notifications, 0);
  });
});
