/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { verifyLocalLibraryStorage } from './local-library-storage.js';

describe('verifyLocalLibraryStorage', () => {
  it('confirms storage readiness after a successful probe round-trip', async () => {
    const storage = new Map<string, string>();

    const result = await verifyLocalLibraryStorage({
      async getItem(key) {
        return storage.get(key) ?? null;
      },
      async removeItem(key) {
        storage.delete(key);
      },
      async setItem(key, value) {
        storage.set(key, value);
      },
    });

    assert.equal(result, true);
    assert.equal(storage.size, 0);
  });

  it('reports storage as unavailable when the probe write fails', async () => {
    const result = await verifyLocalLibraryStorage({
      async getItem() {
        return null;
      },
      async removeItem() {
        return;
      },
      async setItem() {
        throw new Error('quota exceeded');
      },
    });

    assert.equal(result, false);
  });
});
