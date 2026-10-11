import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPinnedBulkBarStore } from './pinned-bulk-bar-store';

// A surface that only makes room for the bar subscribes to whether one is
// pinned, so the bar's props changing must not notify a presence reader twice.
describe('pinned bulk bar presence', () => {
  it('reads as present only while props are published', () => {
    const store = createPinnedBulkBarStore();
    const isPinned = () => store.getSnapshot() !== null;

    assert.equal(isPinned(), false);
    store.set({ actions: [], overflowTitle: '1 selected' });
    assert.equal(isPinned(), true);
    store.set({ actions: [], overflowTitle: '2 selected' });
    assert.equal(isPinned(), true);
    store.set(null);
    assert.equal(isPinned(), false);
  });
});
