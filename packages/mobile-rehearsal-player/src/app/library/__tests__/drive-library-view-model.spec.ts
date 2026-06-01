/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPlaylist } from '@org/audio-library-models';

import {
  AUTHORIZED_STATE,
  BROWSE_SNAPSHOT,
  PLAYABLE_SOURCE,
  SEARCH_SNAPSHOT,
  UNSUPPORTED_SOURCE,
} from '../../test-utils/library-test-fixtures.js';
import './saved-loop-view-model.spec.js';
import './saved-rehearsal-library-view-model.spec.js';
import './saved-track-playback-view-model.spec.js';

import {
  getDriveLibraryStatusCopy,
  getFolderMetadataLabels,
  getSourceAvailabilityLabel,
  getSourceMetadataLabels,
  getSourceStatusMessage,
} from '../utils/drive-library-view-model.js';
import {
  filterSavedLibrarySourcesByQuery as filterSavedLibrarySourcesByLibraryQuery,
  filterSavedLoopsByQuery as filterSavedLoopsByLibraryQuery,
  filterSavedPlaylistsByQuery as filterSavedPlaylistsByLibraryQuery,
  resolveActiveLibrarySearchQuery as resolveActiveLibraryQuery,
} from '../utils/saved-library-search-view-model.js';

describe('getDriveLibraryStatusCopy', () => {
  it('summarizes the browse surface with folders and playable items', () => {
    const copy = getDriveLibraryStatusCopy({
      authState: AUTHORIZED_STATE,
      activeSearchQuery: null,
      browseSnapshot: BROWSE_SNAPSHOT,
      googleAuthConfigured: true,
      isLoading: false,
      issue: null,
      searchSnapshot: {
        query: '',
        playableSources: [],
        unavailableSources: [],
      },
    });

    assert.equal(copy.tone, 'ready');
    assert.equal(copy.title, 'Drive browser ready');
    assert.equal(
      copy.message,
      '1 folder, 1 playable track, and 1 item needs attention are available in My Drive.',
    );
  });

  it('asks the user to reconnect when Drive access has expired', () => {
    const copy = getDriveLibraryStatusCopy({
      authState: {
        ...AUTHORIZED_STATE,
        status: 'expired',
      },
      activeSearchQuery: null,
      browseSnapshot: {
        ...BROWSE_SNAPSHOT,
        folders: [],
        playableSources: [],
        unavailableSources: [],
      },
      googleAuthConfigured: true,
      isLoading: false,
      issue: null,
      searchSnapshot: {
        query: '',
        playableSources: [],
        unavailableSources: [],
      },
    });

    assert.equal(copy.tone, 'warning');
    assert.equal(copy.title, 'Drive access expired');
    assert.match(copy.message, /Reconnect Google Drive/);
  });

  it('surfaces authorization-sensitive refresh failures', () => {
    const copy = getDriveLibraryStatusCopy({
      authState: AUTHORIZED_STATE,
      activeSearchQuery: null,
      browseSnapshot: BROWSE_SNAPSHOT,
      googleAuthConfigured: true,
      isLoading: false,
      issue: 'Drive library request failed with 403',
      searchSnapshot: SEARCH_SNAPSHOT,
    });

    assert.equal(copy.tone, 'error');
    assert.equal(copy.title, 'Drive discovery failed');
    assert.equal(
      copy.message,
      'Drive access needs attention before the rehearsal library can refresh.',
    );
  });

  it('shows detailed Drive API configuration errors when available', () => {
    const copy = getDriveLibraryStatusCopy({
      authState: AUTHORIZED_STATE,
      activeSearchQuery: 'Kyrie',
      browseSnapshot: BROWSE_SNAPSHOT,
      googleAuthConfigured: true,
      isLoading: false,
      issue:
        'Drive library request failed with 403: Google Drive API has not been used in project 123456 before or it is disabled.',
      searchSnapshot: SEARCH_SNAPSHOT,
    });

    assert.equal(copy.tone, 'error');
    assert.equal(copy.title, 'Drive discovery failed');
    assert.equal(
      copy.message,
      'Google Drive API has not been used in project 123456 before or it is disabled.',
    );
  });

  it('summarizes active search results across Drive sources', () => {
    const copy = getDriveLibraryStatusCopy({
      authState: AUTHORIZED_STATE,
      activeSearchQuery: 'Kyrie',
      browseSnapshot: BROWSE_SNAPSHOT,
      googleAuthConfigured: true,
      isLoading: false,
      issue: null,
      searchSnapshot: SEARCH_SNAPSHOT,
    });

    assert.equal(copy.tone, 'ready');
    assert.equal(copy.title, 'Search results ready');
    assert.equal(
      copy.message,
      '1 matching track found, plus 1 item needs attention.',
    );
  });
});

describe('presentation helpers', () => {
  it('formats metadata and source state labels for library cards', () => {
    assert.deepEqual(getSourceMetadataLabels(PLAYABLE_SOURCE), [
      'MP3',
      '3:05',
      'Updated 2026-05-10',
    ]);
    assert.deepEqual(
      getSourceMetadataLabels(SEARCH_SNAPSHOT.playableSources[0]),
      ['MP3', '3:05', 'Updated 2026-05-10', 'Shared with you'],
    );
    assert.equal(getSourceAvailabilityLabel(PLAYABLE_SOURCE), 'Playable');
    assert.equal(getSourceStatusMessage(PLAYABLE_SOURCE), undefined);
    assert.equal(
      getSourceAvailabilityLabel(UNSUPPORTED_SOURCE),
      'Unsupported format',
    );
    assert.equal(
      getSourceStatusMessage(UNSUPPORTED_SOURCE),
      'This Drive file format is outside the MVP audio set.',
    );
  });

  it('formats folder metadata labels for the Drive browser', () => {
    assert.deepEqual(getFolderMetadataLabels(BROWSE_SNAPSHOT.folders[0]), [
      'Folder',
      'Updated 2026-05-10',
    ]);
  });
});

describe('saved library search helpers', () => {
  it('normalizes an active library search query from user input', () => {
    assert.equal(resolveActiveLibraryQuery('  Kyrie  '), 'Kyrie');
    assert.equal(resolveActiveLibraryQuery('   '), null);
  });

  it('filters saved entities by the active library query', () => {
    const sources = [
      PLAYABLE_SOURCE,
      {
        ...PLAYABLE_SOURCE,
        id: 'drive:bass-line',
        name: 'Bass Line.mp3',
      },
    ];
    const loops = [
      {
        createdAt: '2026-05-12T00:00:00.000Z',
        endMs: 18000,
        id: 'loop-1',
        name: 'Entrance cue',
        ownerId: 'user-1',
        ownershipScope: 'user' as const,
        sourceId: PLAYABLE_SOURCE.id,
        sourceName: PLAYABLE_SOURCE.name,
        startMs: 12000,
        updatedAt: '2026-05-12T00:00:00.000Z',
      },
      {
        createdAt: '2026-05-12T00:00:00.000Z',
        endMs: 47000,
        id: 'loop-2',
        name: 'Bass cadence',
        ownerId: 'user-1',
        ownershipScope: 'user' as const,
        sourceId: 'drive:bass-line',
        sourceName: 'Bass Line.mp3',
        startMs: 35000,
        updatedAt: '2026-05-12T00:00:00.000Z',
      },
    ];
    const playlists = [
      createPlaylist({
        createdAt: '2026-05-12T00:00:00.000Z',
        name: 'Kyrie Warmups',
        ownerId: 'user-1',
      }),
      createPlaylist({
        createdAt: '2026-05-12T00:00:00.000Z',
        name: 'Bass Focus',
        ownerId: 'user-1',
      }),
    ];

    assert.deepEqual(
      filterSavedLibrarySourcesByLibraryQuery({
        activeSearchQuery: 'bass',
        sources,
      }).map((source) => source.name),
      ['Bass Line.mp3'],
    );
    assert.deepEqual(
      filterSavedLoopsByLibraryQuery({
        activeSearchQuery: 'bass',
        loops,
      }).map((loop) => loop.name),
      ['Bass cadence'],
    );
    assert.deepEqual(
      filterSavedPlaylistsByLibraryQuery({
        activeSearchQuery: 'kyrie',
        playlists,
      }).map((playlist) => playlist.name),
      ['Kyrie Warmups'],
    );
  });
});
