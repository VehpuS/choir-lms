import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createOfflineFilesNavigationStore } from './offline-files-navigation-store.js';

describe('offline files navigation store', () => {
  it('opens and closes, notifying only on a change', () => {
    const store = createOfflineFilesNavigationStore();
    let calls = 0;

    store.subscribe(() => {
      calls += 1;
    });
    store.open();
    store.open();
    assert.equal(store.getSnapshot(), true);
    store.close();
    store.close();

    assert.equal(store.getSnapshot(), false);
    assert.equal(calls, 2);
  });
});
