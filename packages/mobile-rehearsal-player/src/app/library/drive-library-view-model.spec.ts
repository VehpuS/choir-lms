/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  DriveAuthorizationState,
  DriveBrowseSnapshot,
  DriveSearchSnapshot,
} from '@org/google-drive';

import {
  getFolderMetadataLabels,
  getDriveLibraryStatusCopy,
  getSourceAvailabilityLabel,
  getSourceMetadataLabels,
  getSourceStatusMessage,
} from './drive-library-view-model.js';

const AUTHORIZED_STATE: DriveAuthorizationState = {
  accessToken: 'drive-token',
  scope: 'https://www.googleapis.com/auth/drive.readonly',
  status: 'authorized',
};

const PLAYABLE_SOURCE: DriveBrowseSnapshot['playableSources'][number] = {
  id: 'drive:alto-line',
  provider: 'google-drive',
  driveFileId: 'alto-line',
  name: 'Alto Line.mp3',
  mimeType: 'audio/mpeg',
  extension: 'mp3',
  durationMs: 185000,
  modifiedTime: '2026-05-10T10:00:00.000Z',
  availability: {
    status: 'available',
  },
};

const UNSUPPORTED_SOURCE: DriveBrowseSnapshot['unavailableSources'][number] = {
  id: 'drive:guide-aiff',
  provider: 'google-drive',
  driveFileId: 'guide-aiff',
  name: 'Guide Track.aiff',
  mimeType: 'audio/aiff',
  extension: 'aiff',
  modifiedTime: '2026-05-10T10:00:00.000Z',
  availability: {
    status: 'unsupported',
    reason: 'unsupported-format',
    message: 'This Drive file format is outside the MVP audio set.',
  },
};

const BROWSE_SNAPSHOT: DriveBrowseSnapshot = {
  location: {
    id: 'root',
    kind: 'root',
    name: 'My Drive',
    rootKind: 'my-drive',
  },
  folders: [
    {
      id: 'folder-1',
      name: 'Sectionals',
      modifiedTime: '2026-05-10T10:00:00.000Z',
      rootKind: 'my-drive',
      shared: false,
    },
  ],
  playableSources: [PLAYABLE_SOURCE],
  unavailableSources: [UNSUPPORTED_SOURCE],
};

const SEARCH_SNAPSHOT: DriveSearchSnapshot = {
  query: 'Kyrie',
  playableSources: [
    {
      ...PLAYABLE_SOURCE,
      locationLabel: 'Shared with you',
    },
  ],
  unavailableSources: [
    {
      ...UNSUPPORTED_SOURCE,
      locationLabel: 'My Drive',
    },
  ],
};

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
    assert.deepEqual(getSourceMetadataLabels(SEARCH_SNAPSHOT.playableSources[0]), [
      'MP3',
      '3:05',
      'Updated 2026-05-10',
      'Shared with you',
    ]);
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
