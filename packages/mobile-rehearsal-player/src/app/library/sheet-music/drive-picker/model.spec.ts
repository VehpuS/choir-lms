import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MY_DRIVE_ROOT_LOCATION,
  SHARED_FOLDERS_ROOT_LOCATION,
} from '@org/google-drive';

import {
  canGoUpInDrivePicker,
  classifyDrivePickerFailure,
  createDriveAddition,
  createDrivePickerNavigation,
  currentDrivePickerLocation,
  describeDrivePickerLocation,
  describeDrivePickerResultsLine,
  describeDrivePickerSearchPlaceholder,
  getDrivePickerSearchFolderName,
  goUpInDrivePicker,
  openDrivePickerFolder,
  resolveDrivePickerSearchScope,
  DRIVE_PICKER_ROOTS,
} from './model';

describe('drive picker navigation', () => {
  it('starts at My Drive and cannot go up from a root', () => {
    const navigation = createDrivePickerNavigation();

    assert.deepEqual(
      currentDrivePickerLocation(navigation),
      MY_DRIVE_ROOT_LOCATION,
    );
    assert.equal(canGoUpInDrivePicker(navigation), false);
    assert.equal(goUpInDrivePicker(navigation), navigation);
  });

  it('opens folders as a path and goes back one at a time', () => {
    const inScores = openDrivePickerFolder(createDrivePickerNavigation(), {
      id: 'f1',
      name: 'Scores',
      rootKind: 'my-drive',
    });
    const inMass = openDrivePickerFolder(inScores, {
      id: 'f2',
      name: 'Mass',
      rootKind: 'my-drive',
    });

    assert.equal(
      describeDrivePickerLocation(inMass),
      'My Drive / Scores / Mass',
    );
    assert.equal(currentDrivePickerLocation(inMass).id, 'f2');
    assert.equal(
      currentDrivePickerLocation(goUpInDrivePicker(inMass)).id,
      'f1',
    );
  });

  it('can start from the shared root', () => {
    assert.equal(
      describeDrivePickerLocation(
        createDrivePickerNavigation(SHARED_FOLDERS_ROOT_LOCATION),
      ),
      'Shared folders',
    );
  });
});

describe('classifyDrivePickerFailure', () => {
  it('asks to reconnect when Drive rejects the token', () => {
    assert.equal(
      classifyDrivePickerFailure(new Error('Drive request failed: 401')),
      'needs-drive-access',
    );
    assert.equal(
      classifyDrivePickerFailure(new Error('Drive request failed: 403')),
      'needs-drive-access',
    );
  });

  it('treats anything else as Drive being unavailable', () => {
    assert.equal(
      classifyDrivePickerFailure(new TypeError('Failed to fetch')),
      'unavailable',
    );
    assert.equal(
      classifyDrivePickerFailure(new Error('Drive request failed: 500')),
      'unavailable',
    );
    assert.equal(classifyDrivePickerFailure('boom'), 'unavailable');
  });
});

describe('createDriveAddition', () => {
  it('adds the Drive file by id with its name as the label', () => {
    assert.deepEqual(
      createDriveAddition({
        format: 'musicxml',
        id: 'file-1',
        mimeType: 'application/octet-stream',
        name: 'Kyrie_alto.mxl',
      }),
      {
        format: 'musicxml',
        label: 'Kyrie alto',
        location: { fileId: 'file-1', kind: 'drive', name: 'Kyrie_alto.mxl' },
      },
    );
  });
});

describe('drive picker search scope', () => {
  const root = createDrivePickerNavigation();
  const inScores = openDrivePickerFolder(root, {
    id: 'f1',
    name: 'Scores',
    rootKind: 'my-drive',
  });

  it('follows the folder being browsed, and covers all of Drive at a root', () => {
    assert.equal(resolveDrivePickerSearchScope(inScores, false), 'folder');
    assert.equal(resolveDrivePickerSearchScope(root, false), 'everywhere');
  });

  it('covers all of Drive once widened, and at a root whatever was chosen', () => {
    assert.equal(resolveDrivePickerSearchScope(inScores, true), 'everywhere');
    assert.equal(resolveDrivePickerSearchScope(root, true), 'everywhere');
  });

  it('names the folder only when there is one', () => {
    assert.equal(getDrivePickerSearchFolderName(inScores), 'Scores');
    assert.equal(getDrivePickerSearchFolderName(root), undefined);
  });

  it('says where a search will run in the placeholder and above the results', () => {
    assert.equal(
      describeDrivePickerSearchPlaceholder('folder', 'Scores'),
      'Search in Scores',
    );
    assert.equal(
      describeDrivePickerSearchPlaceholder('everywhere', 'Scores'),
      'Search Drive by name',
    );
    assert.equal(
      describeDrivePickerResultsLine('kyrie', 'folder', 'Scores'),
      'Results for “kyrie” in Scores and its subfolders',
    );
    assert.equal(
      describeDrivePickerResultsLine('kyrie', 'everywhere', 'Scores'),
      'Results for “kyrie” in all of Drive',
    );
  });
});

describe('drive picker roots', () => {
  it('names the shared root after its button', () => {
    assert.deepEqual(
      DRIVE_PICKER_ROOTS.map(({ name, rootKind }) => [name, rootKind]),
      [
        ['My Drive', 'my-drive'],
        ['Shared with you', 'shared'],
      ],
    );
  });
});
