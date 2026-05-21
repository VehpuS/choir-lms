/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  DriveAuthorizationState,
  DriveLibrarySnapshot,
} from '@org/google-drive';

import {
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

const PLAYABLE_SOURCE: DriveLibrarySnapshot['playableSources'][number] = {
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

const UNSUPPORTED_SOURCE: DriveLibrarySnapshot['unavailableSources'][number] = {
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

describe('getDriveLibraryStatusCopy', () => {
  it('summarizes an authorized library with playable and unavailable items', () => {
    const copy = getDriveLibraryStatusCopy({
      authState: AUTHORIZED_STATE,
      googleAuthConfigured: true,
      isLoading: false,
      issue: null,
      snapshot: {
        playableSources: [PLAYABLE_SOURCE],
        unavailableSources: [UNSUPPORTED_SOURCE],
      },
    });

    assert.equal(copy.tone, 'ready');
    assert.equal(copy.title, 'Library ready');
    assert.equal(
      copy.message,
      '1 playable track found, plus 1 item that need attention.',
    );
  });

  it('asks the user to reconnect when Drive access has expired', () => {
    const copy = getDriveLibraryStatusCopy({
      authState: {
        ...AUTHORIZED_STATE,
        status: 'expired',
      },
      googleAuthConfigured: true,
      isLoading: false,
      issue: null,
      snapshot: {
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
      googleAuthConfigured: true,
      isLoading: false,
      issue: 'Drive library request failed with 403',
      snapshot: {
        playableSources: [],
        unavailableSources: [],
      },
    });

    assert.equal(copy.tone, 'error');
    assert.equal(copy.title, 'Library refresh failed');
    assert.equal(
      copy.message,
      'Drive access needs attention before the rehearsal library can refresh.',
    );
  });

  it('shows detailed Drive API configuration errors when available', () => {
    const copy = getDriveLibraryStatusCopy({
      authState: AUTHORIZED_STATE,
      googleAuthConfigured: true,
      isLoading: false,
      issue:
        'Drive library request failed with 403: Google Drive API has not been used in project 123456 before or it is disabled.',
      snapshot: {
        playableSources: [],
        unavailableSources: [],
      },
    });

    assert.equal(copy.tone, 'error');
    assert.equal(copy.title, 'Library refresh failed');
    assert.equal(
      copy.message,
      'Google Drive API has not been used in project 123456 before or it is disabled.',
    );
  });
});

describe('source presentation helpers', () => {
  it('formats metadata and source state labels for library cards', () => {
    assert.deepEqual(getSourceMetadataLabels(PLAYABLE_SOURCE), [
      'MP3',
      '3:05',
      'Updated 2026-05-10',
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
});
