import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSettingsNavigationStore } from './settings-navigation-store.js';

describe('settings navigation store', () => {
  it('opens and closes, notifying only on a real change', () => {
    const store = createSettingsNavigationStore();
    let notifications = 0;

    store.subscribe(() => {
      notifications += 1;
    });
    store.open();
    store.open();
    store.close();
    store.close();

    assert.equal(store.getSnapshot(), false);
    assert.equal(notifications, 2);
  });

  it('stops notifying an unsubscribed listener', () => {
    const store = createSettingsNavigationStore();
    let notifications = 0;
    const unsubscribe = store.subscribe(() => {
      notifications += 1;
    });

    unsubscribe();
    store.open();

    assert.equal(notifications, 0);
  });

  it('opens a category page, goes back to the list, then closes', () => {
    const store = createSettingsNavigationStore();

    store.open();
    store.openPage('piano');
    assert.equal(store.getPage(), 'piano');

    store.back();
    assert.equal(store.getPage(), null);
    assert.equal(store.getSnapshot(), true);

    store.back();
    assert.equal(store.getSnapshot(), false);
  });

  it('starts at the category list each time it opens', () => {
    const store = createSettingsNavigationStore();

    store.openPage('my-parts');
    store.close();
    store.open();

    assert.equal(store.getPage(), null);
  });
});
