/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createDriveAudioSource } from '@org/audio-library-models';
import type {
  DriveCurrentSourceLocationResult,
  DriveFolder,
} from '@org/google-drive';

import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';
import { showSavedSourceOriginalFolderInAdd } from './show-saved-source-in-add.js';

const createSource = (): DriveLibrarySource => {
  return createDriveAudioSource({
    availability: { status: 'available' },
    driveFileId: 'drive-track',
    mimeType: 'audio/mpeg',
    name: 'Warmup.mp3',
    sourceLocation: {
      parentFolderId: 'folder-alto',
      parentFolderName: 'Alto',
      rootKind: 'my-drive',
      path: [{ id: 'folder-alto', name: 'Alto' }],
    },
  });
};

describe('showSavedSourceOriginalFolderInAdd', () => {
  it('opens the resolved current parent folder in Add and switches destinations', async () => {
    const movedLocation = {
      parentFolderId: 'folder-soprano',
      parentFolderName: 'Soprano',
      rootKind: 'shared' as const,
      path: [
        { id: 'folder-concert', name: 'Spring concert' },
        { id: 'folder-soprano', name: 'Soprano' },
      ],
    };
    const openedFolders: DriveFolder[] = [];
    let didGoToAdd = false;

    const result = await showSavedSourceOriginalFolderInAdd({
      accessToken: 'drive-token',
      goToAdd: () => {
        didGoToAdd = true;
      },
      openFolder: (folder) => {
        openedFolders.push(folder);
      },
      resolveCurrentLocation: async () => {
        return {
          status: 'resolved',
          location: movedLocation,
        } satisfies DriveCurrentSourceLocationResult;
      },
      saveSource: async () => true,
      source: createSource(),
    });

    assert.deepEqual(result, { status: 'opened' });
    assert.equal(didGoToAdd, true);
    assert.deepEqual(openedFolders, [
      {
        id: 'folder-soprano',
        name: 'Soprano',
        path: movedLocation.path,
        rootKind: 'shared',
        shared: true,
      },
    ]);
  });

  it('keeps the user in place and reports the reason when resolution fails', async () => {
    let openCount = 0;
    let didGoToAdd = false;

    const result = await showSavedSourceOriginalFolderInAdd({
      accessToken: 'drive-token',
      goToAdd: () => {
        didGoToAdd = true;
      },
      openFolder: () => {
        openCount += 1;
      },
      resolveCurrentLocation: async () => {
        return {
          status: 'unresolved',
          reason: 'no-accessible-parent',
        } satisfies DriveCurrentSourceLocationResult;
      },
      saveSource: async () => true,
      source: createSource(),
    });

    assert.deepEqual(result, {
      status: 'unresolved',
      reason: 'no-accessible-parent',
    });
    assert.equal(openCount, 0);
    assert.equal(didGoToAdd, false);
  });
});
