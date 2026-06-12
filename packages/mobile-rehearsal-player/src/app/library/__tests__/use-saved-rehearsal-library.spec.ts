/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createPlaylistEntryFromLoop,
  createPlaylistEntryFromTrack,
} from '@org/audio-library-models';
import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../test-utils/library-test-fixtures.js';
import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model.js';
import {
  loadSavedRehearsalLibrarySources,
  resolveSavedSourceDurationUpdate,
  verifySavedRehearsalLibraryStorage,
} from '../hooks/use-saved-rehearsal-library.js';
import { loadSavedPlaylists } from '../playlists/hooks/use-saved-playlists.js';
import {
  getSavedPlaylistsStatusCopy,
  getSelectedPlaylistIssue,
} from '../playlists/utils/saved-playlist-status-view-model.js';
import {
  buildSavedPlaylist,
  resolveSavedPlaylistCards,
} from '../playlists/utils/saved-playlist-view-model.js';

const SAVED_SOURCE: DriveLibrarySource = {
  id: 'drive:warmup-track',
  provider: 'google-drive',
  driveFileId: 'warmup-track',
  name: 'Warmup.mp3',
  mimeType: 'audio/mpeg',
  extension: 'mp3',
  durationMs: 92000,
  availability: {
    status: 'available',
  },
};

describe('loadSavedRehearsalLibrarySources', () => {
  it('returns saved sources on the first successful bootstrap read', async () => {
    const result = await loadSavedRehearsalLibrarySources(
      {
        async listSources() {
          return [SAVED_SOURCE];
        },
      },
      'local-device-user',
    );

    assert.deepEqual(result, [SAVED_SOURCE]);
  });

  it('retries the bootstrap read once before succeeding', async () => {
    let attemptCount = 0;

    const result = await loadSavedRehearsalLibrarySources(
      {
        async listSources() {
          attemptCount += 1;

          if (attemptCount === 1) {
            throw new Error('storage warming up');
          }

          return [SAVED_SOURCE];
        },
      },
      'local-device-user',
    );

    assert.equal(attemptCount, 2);
    assert.deepEqual(result, [SAVED_SOURCE]);
  });

  it('falls back to an empty bootstrap state when setup never succeeds', async () => {
    let attemptCount = 0;

    const result = await loadSavedRehearsalLibrarySources(
      {
        async listSources() {
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

describe('verifySavedRehearsalLibraryStorage', () => {
  it('confirms storage readiness after a successful probe round-trip', async () => {
    const storage = new Map<string, string>();

    const result = await verifySavedRehearsalLibraryStorage({
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
    const result = await verifySavedRehearsalLibraryStorage({
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

describe('resolveSavedSourceDurationUpdate', () => {
  it('returns a saved source with a learned duration when metadata was missing', () => {
    assert.deepEqual(
      resolveSavedSourceDurationUpdate(
        [
          {
            ...SAVED_SOURCE,
            durationMs: undefined,
          },
        ],
        SAVED_SOURCE.id,
        93000,
      ),
      {
        ...SAVED_SOURCE,
        durationMs: 93000,
      },
    );
  });

  it('skips updates when the saved source is missing or already has that duration', () => {
    assert.equal(
      resolveSavedSourceDurationUpdate([], SAVED_SOURCE.id, 93000),
      null,
    );
    assert.equal(
      resolveSavedSourceDurationUpdate(
        [
          {
            ...SAVED_SOURCE,
            durationMs: 93000,
          },
        ],
        SAVED_SOURCE.id,
        93000,
      ),
      null,
    );
  });
});

describe('loadSavedPlaylists', () => {
  it('returns saved playlists on the first successful bootstrap read', async () => {
    const playlist = {
      id: 'playlist-1',
      name: 'Wednesday rehearsal',
      items: [],
      ownershipScope: 'user' as const,
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

describe('saved playlist view-model', () => {
  it('requires a playlist name and trims the saved name once provided', () => {
    const emptyResult = buildSavedPlaylist({
      name: '   ',
      ownerId: 'local-device-user',
    });

    assert.deepEqual(emptyResult, {
      issue: {
        title: 'Playlist name required',
        message: 'Enter a playlist name.',
      },
      playlist: null,
    });

    const validResult = buildSavedPlaylist({
      name: '  Wednesday rehearsal  ',
      now: '2026-05-11T00:00:00.000Z',
      ownerId: 'local-device-user',
    });

    assert.equal(validResult.issue, null);
    assert.equal(validResult.playlist?.name, 'Wednesday rehearsal');
    assert.equal(
      validResult.playlist?.id,
      'playlist:local-device-user:2026-05-11T00:00:00.000Z',
    );
  });

  it('summarizes playlist cards and ready-state copy for saved playlists', () => {
    const playlist = {
      id: 'playlist-1',
      name: 'Wednesday rehearsal',
      items: [
        createPlaylistEntryFromTrack(
          PLAYABLE_SOURCE,
          '2026-05-11T00:01:00.000Z',
        ),
        createPlaylistEntryFromLoop(SAVED_LOOP, '2026-05-11T00:02:00.000Z'),
      ],
      ownershipScope: 'user' as const,
      ownerId: 'local-device-user',
      createdAt: '2026-05-11T00:00:00.000Z',
      updatedAt: '2026-05-11T00:02:00.000Z',
    };

    assert.deepEqual(resolveSavedPlaylistCards([playlist]), [
      {
        detailLabel: '2 items • 1 track • 1 loop',
        playlist,
        previewLabel: 'Alto Line.mp3 • Entrance cue',
      },
    ]);

    assert.deepEqual(
      getSavedPlaylistsStatusCopy({
        isLoading: false,
        issue: null,
        savedPlaylistCount: 1,
      }),
      {
        title: 'Saved playlists ready',
        message: '1 playlist ready for saved tracks and loops.',
        tone: 'ready',
      },
    );
  });

  it('only maps a playlist issue when both ids are present and equal', () => {
    assert.equal(getSelectedPlaylistIssue(null, null), null);
    assert.equal(
      getSelectedPlaylistIssue(
        {
          kind: 'save',
          title: 'Could not save playlist',
          message: 'Playlist storage is unavailable.',
        },
        null,
      ),
      null,
    );
    assert.equal(
      getSelectedPlaylistIssue(
        {
          kind: 'save',
          playlistId: 'playlist-1',
          title: 'Could not save playlist',
          message: 'Playlist storage is unavailable.',
        },
        'playlist-2',
      ),
      null,
    );
    assert.deepEqual(
      getSelectedPlaylistIssue(
        {
          kind: 'save',
          playlistId: 'playlist-1',
          title: 'Could not save playlist',
          message: 'Playlist storage is unavailable.',
        },
        'playlist-1',
      ),
      {
        title: 'Could not save playlist',
        message: 'Playlist storage is unavailable.',
      },
    );
  });
});
