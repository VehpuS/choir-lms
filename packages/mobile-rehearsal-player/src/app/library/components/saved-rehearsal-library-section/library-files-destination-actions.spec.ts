import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import { buildLibraryFilesDestinationActions } from './library-files-destination-actions';

const createFiles = (): UseLibraryFilesResult => {
  return {
    destinationFolders: [
      {
        folder: {
          id: 'folder-current',
          name: 'Current',
          parentFolderId: 'folder:library-root',
        },
        label: 'Library / Current',
      },
      {
        folder: {
          id: 'folder-destination',
          name: 'Destination',
          parentFolderId: 'folder:library-root',
        },
        label: 'Library / Destination',
      },
    ],
    explorer: {
      currentFolder: {
        id: 'folder-current',
        name: 'Current',
        parentFolderId: 'folder:library-root',
      },
    },
  } as UseLibraryFilesResult;
};

describe('buildLibraryFilesDestinationActions', () => {
  it('submits the selected destination folder instead of the current folder', () => {
    const submittedFolderIds: string[] = [];
    const actions = buildLibraryFilesDestinationActions({
      files: createFiles(),
      isMutating: false,
      onSubmitDestination(folderId) {
        submittedFolderIds.push(folderId);
      },
      pendingAction: {
        kind: 'copy',
        row: {
          fileLink: {
            entityId: 'source-1',
            entityKind: 'track',
            id: 'file-link:track:source-1',
            parentFolderId: 'folder-current',
          },
          isPlayable: true,
          kind: 'track',
          label: 'Full Choir.mp3',
          source: {
            availability: { status: 'available' },
            driveFileId: 'drive-file-1',
            durationMs: 240000,
            id: 'source-1',
            mimeType: 'audio/mpeg',
            name: 'Full Choir.mp3',
          },
          supportingLabel: 'Track',
        },
      },
    });

    actions.find((action) => action.id === 'folder-destination')?.onPress();

    assert.deepEqual(submittedFolderIds, ['folder-destination']);
    assert.equal(actions[0]?.label, 'Library / Current (current folder)');
  });
});
