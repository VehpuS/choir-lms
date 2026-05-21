/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  DriveAuthorizationState,
  DriveBrowseSnapshot,
  DriveSearchSnapshot,
} from '@org/google-drive';

import {
  getDriveLibraryStatusCopy,
  getFolderMetadataLabels,
  getSourceAvailabilityLabel,
  getSourceMetadataLabels,
  getSourceStatusMessage,
} from './drive-library-view-model.js';
import {
  getSavedRehearsalLibrarySourceIssue,
  getSavedRehearsalLibraryStatusCopy,
  resolveSavedRehearsalLibrarySources,
} from './saved-rehearsal-library-view-model.js';

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

  it('marks saved tracks unavailable until Drive access is restored', () => {
    const savedSources = resolveSavedRehearsalLibrarySources({
      authState: {
        ...AUTHORIZED_STATE,
        status: 'expired',
      },
      savedSources: [PLAYABLE_SOURCE],
      visibleSources: [
        {
          ...PLAYABLE_SOURCE,
          modifiedTime: '2026-05-11T10:00:00.000Z',
        },
      ],
    });

    assert.equal(savedSources[0]?.availability.status, 'unavailable');
    assert.equal(
      savedSources[0]?.availability.reason,
      'authorization-required',
    );
    assert.equal(
      savedSources[0]?.availability.message,
      'Reconnect Google Drive to restore this saved rehearsal track.',
    );
  });

  it('uses refreshed discovery metadata for saved tracks when Drive is authorized', () => {
    const refreshedSource = {
      ...PLAYABLE_SOURCE,
      modifiedTime: '2026-05-11T10:00:00.000Z',
      locationLabel: 'Shared with you',
    };

    const savedSources = resolveSavedRehearsalLibrarySources({
      authState: AUTHORIZED_STATE,
      savedSources: [PLAYABLE_SOURCE],
      visibleSources: [refreshedSource],
    });

    assert.deepEqual(savedSources, [refreshedSource]);
  });

  it('summarizes saved-library readiness and access warnings', () => {
    const readyCopy = getSavedRehearsalLibraryStatusCopy({
      authState: AUTHORIZED_STATE,
      isLoading: false,
      issue: null,
      savedSources: [PLAYABLE_SOURCE],
    });

    assert.equal(readyCopy.tone, 'ready');
    assert.equal(readyCopy.title, 'Saved rehearsal library ready');
    assert.equal(
      readyCopy.message,
      '1 saved track available for playback, loops, and playlists.',
    );

    const warningCopy = getSavedRehearsalLibraryStatusCopy({
      authState: {
        ...AUTHORIZED_STATE,
        status: 'attention-required',
      },
      isLoading: false,
      issue: null,
      savedSources: [
        {
          ...PLAYABLE_SOURCE,
          availability: {
            status: 'unavailable',
            reason: 'access-revoked',
            message:
              'Connect Google Drive to verify or play this saved rehearsal track.',
          },
        },
      ],
    });

    assert.equal(warningCopy.tone, 'warning');
    assert.equal(warningCopy.title, 'Saved tracks need Drive access');
    assert.match(warningCopy.message, /1 saved track remain[s]? visible/);
  });

  it('uses a load-safe error title when the saved library reports an issue', () => {
    const copy = getSavedRehearsalLibraryStatusCopy({
      authState: AUTHORIZED_STATE,
      isLoading: false,
      issue: {
        kind: 'storage',
        title: 'Saved rehearsal storage unavailable',
        message: 'This build could not access the device storage needed for the saved rehearsal library.',
      },
      savedSources: [],
    });

    assert.equal(copy.tone, 'error');
    assert.equal(copy.title, 'Saved rehearsal storage unavailable');
    assert.equal(
      copy.message,
      'This build could not access the device storage needed for the saved rehearsal library.',
    );
  });

  it('keeps save-specific failures off the section status card', () => {
    const copy = getSavedRehearsalLibraryStatusCopy({
      authState: AUTHORIZED_STATE,
      isLoading: false,
      issue: {
        kind: 'save',
        sourceId: PLAYABLE_SOURCE.id,
        title: 'Could not save track',
        message:
          'The saved rehearsal library could not save "Warmup.mp3". quota exceeded',
      },
      savedSources: [],
    });

    assert.equal(copy.tone, 'neutral');
    assert.equal(copy.title, 'No saved tracks yet');
  });

  it('maps save-specific failures onto the source card that triggered them', () => {
    const issue = {
      kind: 'save' as const,
      sourceId: PLAYABLE_SOURCE.id,
      title: 'Could not save track',
      message:
        'The saved rehearsal library could not save "Alto Line.mp3". quota exceeded',
    };

    assert.equal(
      getSavedRehearsalLibrarySourceIssue(issue, PLAYABLE_SOURCE, 'save'),
      'The saved rehearsal library could not save "Alto Line.mp3". quota exceeded',
    );
    assert.equal(
      getSavedRehearsalLibrarySourceIssue(issue, UNSUPPORTED_SOURCE, 'save'),
      undefined,
    );
    assert.equal(
      getSavedRehearsalLibrarySourceIssue(issue, PLAYABLE_SOURCE, 'remove'),
      undefined,
    );
  });
});
