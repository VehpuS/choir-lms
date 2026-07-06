/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createAuthorizationSessionStore,
  type WebStorageLike,
} from './authorization-session-store.js';
import {
  createAuthorizedDriveState,
  persistDriveAuthorizationState,
  restoreDriveAuthorizationState,
} from './authorization.js';

const DEFAULT_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

const createMemoryWebStorage = () => {
  const values = new Map<string, string>();

  const webStorage: WebStorageLike = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };

  return {
    read(key: string) {
      return values.get(key) ?? null;
    },
    webStorage,
  };
};

describe('authorizationSessionStore', () => {
  it('uses browser storage on web without touching SecureStore', async () => {
    let didTouchSecureStore = false;
    const memoryWebStorage = createMemoryWebStorage();
    const store = createAuthorizationSessionStore({
      platform: 'web',
      secureStore: {
        async getItemAsync() {
          didTouchSecureStore = true;
          return null;
        },
        async setItemAsync() {
          didTouchSecureStore = true;
        },
        async deleteItemAsync() {
          didTouchSecureStore = true;
        },
      },
      webStorage: memoryWebStorage.webStorage,
    });
    const authorizedState = createAuthorizedDriveState(
      {
        accessToken: 'drive-token',
        expiresIn: 3600,
        issuedAt: Math.floor(Date.now() / 1000),
        scope: DEFAULT_SCOPE,
      },
      DEFAULT_SCOPE,
    );

    await persistDriveAuthorizationState(store, authorizedState);
    const restoredState = await restoreDriveAuthorizationState(
      store,
      DEFAULT_SCOPE,
    );

    assert.equal(didTouchSecureStore, false);
    assert.equal(restoredState.status, 'authorized');
    assert.equal(restoredState.accessToken, 'drive-token');
    assert.ok(memoryWebStorage.read('choirlms.google-drive.authorization'));
  });

  it('uses SecureStore on native platforms when the API is available', async () => {
    const writes: string[] = [];
    const values = new Map<string, string>();
    const store = createAuthorizationSessionStore({
      platform: 'ios',
      secureStore: {
        async getItemAsync(key) {
          writes.push(`get:${key}`);
          return values.get(key) ?? null;
        },
        async setItemAsync(key, value) {
          writes.push(`set:${key}`);
          values.set(key, value);
        },
        async deleteItemAsync(key) {
          writes.push(`delete:${key}`);
          values.delete(key);
        },
      },
      webStorage: null,
    });
    const authorizedState = createAuthorizedDriveState(
      {
        accessToken: 'drive-token',
        expiresIn: 3600,
        issuedAt: Math.floor(Date.now() / 1000),
        scope: DEFAULT_SCOPE,
      },
      DEFAULT_SCOPE,
    );

    await persistDriveAuthorizationState(store, authorizedState);
    const restoredState = await restoreDriveAuthorizationState(
      store,
      DEFAULT_SCOPE,
    );

    assert.equal(restoredState.status, 'authorized');
    assert.equal(restoredState.accessToken, 'drive-token');
    assert.ok(writes.includes('set:choirlms.google-drive.authorization'));
    assert.ok(writes.includes('get:choirlms.google-drive.authorization'));
  });

  it('falls back to a no-op store when no storage API is available', async () => {
    const store = createAuthorizationSessionStore({
      platform: 'web',
      secureStore: {},
      webStorage: null,
    });
    const authorizedState = createAuthorizedDriveState(
      {
        accessToken: 'drive-token',
        expiresIn: 3600,
        issuedAt: Math.floor(Date.now() / 1000),
        scope: DEFAULT_SCOPE,
      },
      DEFAULT_SCOPE,
    );

    await persistDriveAuthorizationState(store, authorizedState);
    const restoredState = await restoreDriveAuthorizationState(
      store,
      DEFAULT_SCOPE,
    );

    assert.equal(restoredState.status, 'unconfigured');
    assert.equal(restoredState.accessToken, undefined);
  });
});
