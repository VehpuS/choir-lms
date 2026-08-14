/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadSavedPlaylists } from './use-saved-playlists.js';

describe('loadSavedPlaylists', () => {
  it('returns saved playlists on the first successful bootstrap read', async () => {
    const playlist = {
      id: 'playlist-1',
      name: 'Wednesday rehearsal',
      items: [],
      ownerId: 'local-device-user',
      createdAt: '2026-05-11T00:00:00.000Z',
      updatedAt: '2026-05-11T00:00:00.000Z',
    };

    const result = await loadSavedPlaylists(
      {
        async listPlaylists() {
          return [playlist];
        },
      },
      'local-device-user',
    );

    assert.deepEqual(result, [playlist]);
  });

  it('falls back to an empty bootstrap playlist state when setup never succeeds', async () => {
    let attemptCount = 0;

    const result = await loadSavedPlaylists(
      {
        async listPlaylists() {
          attemptCount += 1;
          throw new Error('storage unavailable');
        },
      },
      'local-device-user',
    );

    assert.equal(attemptCount, 2);
    assert.deepEqual(result, []);
  });
});
