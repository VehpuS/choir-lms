import type { DriveDiscoveryResult } from '@org/google-drive';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildDriveImportReviewSummaryRows,
  hasFolderInSelection,
  resolveDriveImportReviewMode,
  sortDriveImportDestinationFolders,
  type DriveImportDestinationFolderOption,
} from './drive-import-review-model.js';

const buildFolder = (
  overrides: Partial<Extract<DriveDiscoveryResult, { kind: 'folder' }>> = {},
): DriveDiscoveryResult => ({
  id: 'drive-folder-1',
  kind: 'folder',
  name: 'Sopranos',
  rootKind: 'my-drive',
  shared: false,
  ...overrides,
});

const buildAudio = (
  overrides: Partial<Extract<DriveDiscoveryResult, { kind: 'audio' }>> = {},
): DriveDiscoveryResult => ({
  availability: { status: 'available' },
  createdAt: '2026-09-16T00:00:00.000Z',
  driveFileId: 'drive-audio-1',
  id: 'drive-audio-1',
  kind: 'audio',
  mimeType: 'audio/mpeg',
  name: 'Kyrie Alto.mp3',
  provider: 'google-drive',
  rootKind: 'my-drive',
  ...overrides,
});

describe('hasFolderInSelection', () => {
  it('reports true when the selection contains at least one folder', () => {
    assert.equal(
      hasFolderInSelection([buildAudio(), buildFolder()]),
      true,
    );
  });

  it('reports false for a folder-free selection of only audio results', () => {
    assert.equal(
      hasFolderInSelection([buildAudio({ id: 'a' }), buildAudio({ id: 'b' })]),
      false,
    );
  });

  it('reports false for an empty selection', () => {
    assert.equal(hasFolderInSelection([]), false);
  });
});

describe('resolveDriveImportReviewMode', () => {
  it('forces flatten for a folder-free selection regardless of any chosen mode', () => {
    assert.equal(
      resolveDriveImportReviewMode({
        hasFolderSelection: false,
        selectedMode: 'preserve-structure',
      }),
      'flatten',
    );
  });

  it('defaults to preserve structure once a folder is selected and no choice was made yet', () => {
    assert.equal(
      resolveDriveImportReviewMode({
        hasFolderSelection: true,
        selectedMode: null,
      }),
      'preserve-structure',
    );
  });

  it('honors an explicit flatten choice when a folder is selected', () => {
    assert.equal(
      resolveDriveImportReviewMode({
        hasFolderSelection: true,
        selectedMode: 'flatten',
      }),
      'flatten',
    );
  });
});

describe('sortDriveImportDestinationFolders', () => {
  it('orders destination folders by their readable path label', () => {
    const folders: DriveImportDestinationFolderOption[] = [
      {
        folder: {
          createdAt: '2026-01-01T00:00:00.000Z',
          id: 'z',
          name: 'Winter',
          parentFolderId: null,
        },
        label: 'Winter',
      },
      {
        folder: {
          createdAt: '2026-01-01T00:00:00.000Z',
          id: 'a',
          name: 'Advent',
          parentFolderId: null,
        },
        label: 'Advent',
      },
    ];

    assert.deepEqual(
      sortDriveImportDestinationFolders(folders).map(({ label }) => label),
      ['Advent', 'Winter'],
    );
  });
});

describe('buildDriveImportReviewSummaryRows', () => {
  it('maps every review summary count to a labeled row', () => {
    assert.deepEqual(
      buildDriveImportReviewSummaryRows({
        alreadyPresentTracks: 1,
        collapsedOverlaps: 2,
        foldersToCreate: 3,
        newTracks: 4,
        reusableTracks: 5,
        tracksToImport: 9,
        unsupportedFiles: 6,
      }),
      [
        { key: 'foldersToCreate', label: 'Folders to create', value: 3 },
        { key: 'newTracks', label: 'New tracks', value: 4 },
        { key: 'reusableTracks', label: 'Reused tracks', value: 5 },
        {
          key: 'alreadyPresentTracks',
          label: 'Already in destination',
          value: 1,
        },
        {
          key: 'unsupportedFiles',
          label: 'Unsupported files skipped',
          value: 6,
        },
        {
          key: 'collapsedOverlaps',
          label: 'Overlapping selections collapsed',
          value: 2,
        },
      ],
    );
  });
});
