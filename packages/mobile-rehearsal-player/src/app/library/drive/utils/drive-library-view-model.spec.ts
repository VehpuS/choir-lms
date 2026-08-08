/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AUTHORIZED_STATE,
  BROWSE_SNAPSHOT,
  PLAYABLE_SOURCE,
  SEARCH_SNAPSHOT,
  UNSUPPORTED_SOURCE,
} from '../../../test-utils/library-test-fixtures.js';
import {
  getDriveLibraryStatusCopy,
  getDriveSearchContextCopy,
  getFolderMetadataLabels,
  getLibrarySearchContextCopy,
  getSourceAvailabilityLabel,
  getSourceMetadataLabels,
  getSourceStatusMessage,
} from './drive-library-view-model.js';

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

  it('uses folder-scoped copy while Drive search is loading', () => {
    const copy = getDriveLibraryStatusCopy({
      authState: AUTHORIZED_STATE,
      activeSearchQuery: 'Roxanne',
      browseSnapshot: BROWSE_SNAPSHOT,
      currentSearchLocation: {
        id: 'folder-archive',
        kind: 'folder',
        name: 'Music Archive',
        rootKind: 'my-drive',
      },
      googleAuthConfigured: true,
      isLoading: true,
      issue: null,
      searchSnapshot: {
        query: 'Roxanne',
        playableSources: [],
        unavailableSources: [],
      },
    });

    assert.equal(copy.tone, 'neutral');
    assert.equal(copy.title, 'Searching Google Drive');
    assert.equal(
      copy.message,
      'Looking for matching audio in Music Archive and nested folders.',
    );
  });
});

describe('drive library presentation helpers', () => {
  it('keeps default source metadata concise while preserving useful state', () => {
    assert.deepEqual(getSourceMetadataLabels(PLAYABLE_SOURCE), ['3:05']);
    assert.deepEqual(
      getSourceMetadataLabels(SEARCH_SNAPSHOT.playableSources[0]),
      ['3:05', 'Shared with you'],
    );
    assert.deepEqual(
      getSourceMetadataLabels({
        ...PLAYABLE_SOURCE,
        name: 'Alto Line',
      }),
      ['MP3', '3:05'],
    );
    assert.deepEqual(
      getSourceMetadataLabels({
        ...PLAYABLE_SOURCE,
        durationMs: undefined,
      }),
      [],
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

  it('includes updated dates only when the active context requests them', () => {
    assert.deepEqual(getFolderMetadataLabels(BROWSE_SNAPSHOT.folders[0]), []);
    assert.deepEqual(
      getFolderMetadataLabels({
        ...BROWSE_SNAPSHOT.folders[0],
        shared: true,
      }),
      ['Shared folder'],
    );
    assert.deepEqual(
      getFolderMetadataLabels(BROWSE_SNAPSHOT.folders[0], {
        includeUpdatedDate: true,
      }),
      ['Updated 2026-05-10'],
    );
    assert.deepEqual(
      getSourceMetadataLabels(PLAYABLE_SOURCE, {
        includeUpdatedDate: true,
      }),
      ['3:05', 'Updated 2026-05-10'],
    );
  });
});

describe('drive library search context copy', () => {
  it('shows My Drive scoped search copy at root', () => {
    assert.deepEqual(getDriveSearchContextCopy(BROWSE_SNAPSHOT.location), {
      helper: 'Search in My Drive',
      placeholder: 'Search in My Drive',
    });
  });

  it('shows folder-scoped search copy after drill-down', () => {
    assert.deepEqual(
      getDriveSearchContextCopy({
        id: 'folder-1',
        kind: 'folder',
        name: 'Sectionals',
        rootKind: 'my-drive',
      }),
      {
        helper: 'Search in Sectionals',
        placeholder: 'Search in Sectionals',
      },
    );
  });

  it('adds bracketed corpus detail in library search copy', () => {
    assert.deepEqual(getLibrarySearchContextCopy(), {
      helper: 'Search saved library (playlists, tracks, and loops)',
      placeholder: 'Search saved library',
    });
  });
});
