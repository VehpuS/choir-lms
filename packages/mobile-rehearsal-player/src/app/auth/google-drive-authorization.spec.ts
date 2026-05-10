import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AuthSessionResult } from 'expo-auth-session';

import {
  clearDriveAuthorizationState,
  createAuthorizedDriveState,
  getDriveAuthorizationStatusCopy,
  persistDriveAuthorizationState,
  resolveDriveAuthorizationResult,
  restoreDriveAuthorizationState,
  type AuthorizationSessionStore,
} from './google-drive-authorization.js';

const DEFAULT_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

const createMemoryStore = (initialValue: string | null = null) => {
  let value = initialValue;

  const store: AuthorizationSessionStore = {
    async getItem() {
      return value;
    },
    async setItem(_key, nextValue) {
      value = nextValue;
    },
    async deleteItem() {
      value = null;
    },
  };

  return {
    read() {
      return value;
    },
    store,
  };
};

describe('createAuthorizedDriveState', () => {
  it('normalizes a token into an authorized Drive session', () => {
    const issuedAt = Math.floor(Date.now() / 1000);
    const state = createAuthorizedDriveState(
      {
        accessToken: 'drive-token',
        expiresIn: 3600,
        issuedAt,
        scope: 'drive.readonly',
      },
      DEFAULT_SCOPE,
    );

    assert.equal(state.status, 'authorized');
    assert.equal(state.accessToken, 'drive-token');
    assert.equal(state.scope, 'drive.readonly');
    assert.equal(
      state.expiresAt,
      new Date((issuedAt + 3600) * 1000).toISOString(),
    );
  });
});

describe('resolveDriveAuthorizationResult', () => {
  it('falls back to OAuth query params when authentication is not attached', () => {
    const outcome = resolveDriveAuthorizationResult(
      {
        type: 'success',
        authentication: null,
        error: null,
        errorCode: null,
        params: {
          access_token: 'drive-token',
          expires_in: '1800',
          token_type: 'Bearer',
        },
        url: 'https://accounts.google.com/o/oauth2/v2/auth',
      } satisfies AuthSessionResult,
      DEFAULT_SCOPE,
    );

    assert.ok(outcome);
    assert.equal(outcome?.kind, 'authorized');

    if (outcome?.kind !== 'authorized') {
      return;
    }

    assert.equal(outcome.state.status, 'authorized');
    assert.equal(outcome.state.accessToken, 'drive-token');
    assert.equal(outcome.state.scope, DEFAULT_SCOPE);
    assert.ok(outcome.state.expiresAt);
  });

  it('returns actionable copy for missing credentials and sign-in failures', () => {
    const missingCredentialsCopy = getDriveAuthorizationStatusCopy(
      {
        scope: DEFAULT_SCOPE,
        status: 'unconfigured',
      },
      {
        googleAuthConfigured: false,
      },
    );

    const failedSignInCopy = getDriveAuthorizationStatusCopy(
      {
        scope: DEFAULT_SCOPE,
        status: 'unconfigured',
      },
      {
        googleAuthConfigured: true,
        lastIssue:
          'The sign-in popup was closed before authorization finished.',
      },
    );

    assert.equal(missingCredentialsCopy.tone, 'error');
    assert.equal(missingCredentialsCopy.actionLabel, 'Credentials required');
    assert.equal(failedSignInCopy.tone, 'warning');
    assert.equal(
      failedSignInCopy.message,
      'The sign-in popup was closed before authorization finished.',
    );
  });
});

describe('authorization persistence', () => {
  it('persists and restores an authorized session', async () => {
    const memoryStore = createMemoryStore();
    const issuedAt = Math.floor(Date.now() / 1000);
    const state = createAuthorizedDriveState(
      {
        accessToken: 'drive-token',
        expiresIn: 3600,
        issuedAt,
        scope: DEFAULT_SCOPE,
      },
      DEFAULT_SCOPE,
    );

    await persistDriveAuthorizationState(memoryStore.store, state);

    const persistedValue = memoryStore.read();

    assert.ok(persistedValue);
    assert.equal(JSON.parse(persistedValue ?? '{}').accessToken, 'drive-token');

    const restoredState = await restoreDriveAuthorizationState(
      memoryStore.store,
      DEFAULT_SCOPE,
    );

    assert.equal(restoredState.status, 'authorized');
    assert.equal(restoredState.accessToken, 'drive-token');
    assert.equal(restoredState.scope, DEFAULT_SCOPE);
  });

  it('clears any saved session data', async () => {
    const memoryStore = createMemoryStore(
      JSON.stringify({
        accessToken: 'drive-token',
        scope: DEFAULT_SCOPE,
      }),
    );

    const clearedState = await clearDriveAuthorizationState(
      memoryStore.store,
      DEFAULT_SCOPE,
    );

    assert.equal(memoryStore.read(), null);
    assert.equal(clearedState.status, 'unconfigured');
    assert.equal(clearedState.scope, DEFAULT_SCOPE);
  });
});
