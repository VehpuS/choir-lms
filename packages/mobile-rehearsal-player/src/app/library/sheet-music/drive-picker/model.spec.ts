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
  goUpInDrivePicker,
  openDrivePickerFolder,
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
