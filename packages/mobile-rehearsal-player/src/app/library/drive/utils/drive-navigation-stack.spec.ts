/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MY_DRIVE_ROOT_LOCATION,
  SHARED_FOLDERS_ROOT_LOCATION,
  type DriveFolder,
} from '@org/google-drive';

import { buildDriveFolderNavigationStack } from './drive-navigation-stack.js';

const SEARCH_FOLDER: DriveFolder = {
  id: 'warmups',
  locationLabel: 'Shared with you / Choir / Autumn',
  name: 'Warmups',
  path: [
    { id: 'choir', name: 'Choir' },
    { id: 'autumn', name: 'Autumn' },
  ],
  rootKind: 'shared',
  shared: true,
};

describe('buildDriveFolderNavigationStack', () => {
  it('reconstructs every accessible ancestor for a search folder result', () => {
    const stack = buildDriveFolderNavigationStack({
      currentStack: [MY_DRIVE_ROOT_LOCATION],
      folder: SEARCH_FOLDER,
    });

    assert.deepEqual(
      stack.map(({ id, name, rootKind }) => ({ id, name, rootKind })),
      [
        {
          id: SHARED_FOLDERS_ROOT_LOCATION.id,
          name: SHARED_FOLDERS_ROOT_LOCATION.name,
          rootKind: 'shared',
        },
        { id: 'choir', name: 'Choir', rootKind: 'shared' },
        { id: 'autumn', name: 'Autumn', rootKind: 'shared' },
        { id: 'warmups', name: 'Warmups', rootKind: 'shared' },
      ],
    );
  });

  it('appends an immediate browse child when no resolved path is present', () => {
    const stack = buildDriveFolderNavigationStack({
      currentStack: [
        MY_DRIVE_ROOT_LOCATION,
        {
          id: 'choir',
          kind: 'folder',
          name: 'Choir',
          rootKind: 'my-drive',
        },
      ],
      folder: {
        id: 'warmups',
        name: 'Warmups',
        rootKind: 'my-drive',
        shared: false,
      },
    });

    assert.deepEqual(
      stack.map(({ id }) => id),
      [MY_DRIVE_ROOT_LOCATION.id, 'choir', 'warmups'],
    );
  });

  it('opens the My Drive root as the root level, not as a folder inside it', () => {
    const stack = buildDriveFolderNavigationStack({
      currentStack: [SHARED_FOLDERS_ROOT_LOCATION],
      folder: {
        id: MY_DRIVE_ROOT_LOCATION.id,
        name: MY_DRIVE_ROOT_LOCATION.name,
        path: [],
        rootKind: 'my-drive',
        shared: false,
      },
    });

    assert.deepEqual(stack, [MY_DRIVE_ROOT_LOCATION]);
  });
});
