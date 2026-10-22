import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MY_DRIVE_ROOT_LOCATION,
  SHARED_FOLDERS_ROOT_LOCATION,
} from '@org/google-drive';

import {
  canSaveHere,
  createFolderPickerNavigation,
  resolveSaveTarget,
  toSaveFolder,
} from './folder-mode-model';
import {
  createDrivePickerNavigation,
  currentDrivePickerLocation,
  openDrivePickerFolder,
} from './model';

const TRACK_FOLDER = {
  path: [
    { id: 'choir', name: 'Choir' },
    { id: 'altos', name: 'Altos' },
  ],
  rootKind: 'my-drive' as const,
};
const REMEMBERED = {
  path: [{ id: 'scores', name: 'Scores' }],
  rootKind: 'shared' as const,
};

describe('createFolderPickerNavigation', () => {
  it('opens at the track folder, with its path to go up through', () => {
    const navigation = createFolderPickerNavigation({
      remembered: REMEMBERED,
      trackFolder: TRACK_FOLDER,
    });

    assert.deepEqual(
      navigation.stack.map(({ id }) => id),
      ['root', 'choir', 'altos'],
    );
    assert.equal(currentDrivePickerLocation(navigation).name, 'Altos');
  });

  it('falls back to the remembered folder, in the shared root it was in', () => {
    const navigation = createFolderPickerNavigation({
      remembered: REMEMBERED,
    });

    assert.equal(navigation.stack[0], SHARED_FOLDERS_ROOT_LOCATION);
    assert.equal(currentDrivePickerLocation(navigation).id, 'scores');
  });

  it('opens at My Drive with neither', () => {
    assert.deepEqual(createFolderPickerNavigation({}), {
      stack: [MY_DRIVE_ROOT_LOCATION],
    });
  });

  it('opens at the root when the stored folder has an empty path', () => {
    const navigation = createFolderPickerNavigation({
      trackFolder: { path: [], rootKind: 'my-drive' },
    });

    assert.deepEqual(navigation.stack, [MY_DRIVE_ROOT_LOCATION]);
  });
});

describe('Save here', () => {
  it('saves into My Drive itself and into any opened folder', () => {
    const root = createDrivePickerNavigation(MY_DRIVE_ROOT_LOCATION);
    const folder = openDrivePickerFolder(root, {
      id: 'scores',
      name: 'Scores',
      rootKind: 'my-drive',
    });

    assert.deepEqual(resolveSaveTarget(root), {
      folderId: 'root',
      folderName: 'My Drive',
    });
    assert.deepEqual(resolveSaveTarget(folder), {
      folderId: 'scores',
      folderName: 'Scores',
    });
  });

  it('is not offered at the Shared with me root, which is not a folder', () => {
    const shared = createDrivePickerNavigation(SHARED_FOLDERS_ROOT_LOCATION);

    assert.equal(canSaveHere(shared), false);
    assert.equal(resolveSaveTarget(shared), undefined);
  });

  it('turns where the user saved into the path the picker reopens at', () => {
    const navigation = createFolderPickerNavigation({
      trackFolder: TRACK_FOLDER,
    });

    assert.deepEqual(toSaveFolder(navigation), TRACK_FOLDER);
    assert.deepEqual(
      createFolderPickerNavigation({ remembered: toSaveFolder(navigation) }),
      navigation,
    );
  });
});
