/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getOriginalDriveLocationViewModel } from './original-drive-location-view-model.js';

describe('original Drive location view-model', () => {
  it('formats complete My Drive ancestry and enables both location actions', () => {
    assert.deepEqual(
      getOriginalDriveLocationViewModel({
        sourceLocation: {
          parentFolderId: 'folder-alto',
          parentFolderName: 'Alto',
          rootKind: 'my-drive',
          path: [
            { id: 'folder-concert', name: 'Spring concert' },
            { id: 'folder-alto', name: 'Alto' },
          ],
        },
      }),
      {
        canOpenInGoogleDrive: true,
        canShowInAdd: true,
        pathLabel: 'My Drive / Spring concert / Alto',
      },
    );
  });

  it('presents deepest accessible shared ancestry as actionable last-known context', () => {
    assert.deepEqual(
      getOriginalDriveLocationViewModel({
        sourceLocation: {
          parentFolderId: 'folder-alto',
          parentFolderName: 'Alto',
          rootKind: 'shared',
          path: [
            { id: 'folder-accessible', name: 'Accessible concert folder' },
            { id: 'folder-alto', name: 'Alto' },
          ],
        },
      }),
      {
        canOpenInGoogleDrive: true,
        canShowInAdd: true,
        pathLabel: 'Shared with you / Accessible concert folder / Alto',
      },
    );
  });

  it('disables original-location actions for legacy sources without provenance', () => {
    assert.deepEqual(getOriginalDriveLocationViewModel({}), {
      canOpenInGoogleDrive: false,
      canShowInAdd: false,
      pathLabel: 'Original Drive location unavailable',
    });
  });
});
