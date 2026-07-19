import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import { buildLibraryFilesDestinationPicker } from './library-files-destination-actions';

const noop = () => undefined;

const createFiles = (): UseLibraryFilesResult => {
  return {
    destinationFolders: [
      {
        folder: {
          id: 'folder:library-root',
          name: 'Library',
          parentFolderId: null,
        },
        label: 'Library',
      },
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
      {
        folder: {
          id: 'folder-current-child',
          name: 'Current child',
          parentFolderId: 'folder-current',
        },
        label: 'Library / Current / Current child',
      },
      {
        folder: {
          id: 'folder-nested',
          name: 'Nested destination',
          parentFolderId: 'folder-destination',
        },
        label: 'Library / Destination / Nested destination',
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

const createTrackRow = () => {
  return {
    fileLink: {
      entityId: 'source-1',
      entityKind: 'track' as const,
      id: 'file-link:track:source-1',
      parentFolderId: 'folder-current',
    },
    isPlayable: true,
    kind: 'track' as const,
    label: 'Full Choir.mp3',
    source: {
      availability: { status: 'available' as const },
      driveFileId: 'drive-file-1',
      durationMs: 240000,
      id: 'source-1',
      mimeType: 'audio/mpeg',
      name: 'Full Choir.mp3',
      provider: 'google-drive' as const,
    },
    supportingLabel: 'Track',
  };
};

describe('buildLibraryFilesDestinationPicker', () => {
  it('submits the picker folder separately from folder drill-down actions', () => {
    const submittedFolderIds: string[] = [];
    const openedFolderIds: string[] = [];
    const picker = buildLibraryFilesDestinationPicker({
      currentPickerFolderId: 'folder-current',
      files: createFiles(),
      isMutating: false,
      onOpenDestinationFolder(folderId) {
        openedFolderIds.push(folderId);
      },
      onSubmitDestination(folderId) {
        submittedFolderIds.push(folderId);
      },
      pendingAction: {
        kind: 'copy',
        row: createTrackRow(),
      },
    });

    picker.actions
      .find((action) => action.id === 'folder-current:select-destination')
      ?.onPress();
    picker.actions
      .find((action) => action.id === 'folder-current-child:open-destination')
      ?.onPress();

    assert.deepEqual(submittedFolderIds, ['folder-current']);
    assert.deepEqual(openedFolderIds, ['folder-current-child']);
    assert.equal(picker.title, 'Copy to Current');
    assert.equal(picker.actions[0]?.label, 'Copy here (current folder)');
  });

  it('shows parent navigation when browsing a nested destination folder', () => {
    const openedFolderIds: string[] = [];
    const picker = buildLibraryFilesDestinationPicker({
      currentPickerFolderId: 'folder-destination',
      files: createFiles(),
      isMutating: false,
      onOpenDestinationFolder(folderId) {
        openedFolderIds.push(folderId);
      },
      onSubmitDestination: noop,
      pendingAction: {
        kind: 'copy',
        row: createTrackRow(),
      },
    });

    picker.actions
      .find((action) => {
        return action.id === 'folder:library-root:open-parent-destination';
      })
      ?.onPress();
    picker.actions
      .find((action) => action.id === 'folder-nested:open-destination')
      ?.onPress();

    assert.deepEqual(openedFolderIds, ['folder:library-root', 'folder-nested']);
    assert.equal(picker.title, 'Copy to Destination');
  });

  it('blocks selecting a folder move target inside the moved folder subtree', () => {
    const picker = buildLibraryFilesDestinationPicker({
      currentPickerFolderId: 'folder-destination',
      files: createFiles(),
      isMutating: false,
      onOpenDestinationFolder: noop,
      onSubmitDestination: noop,
      pendingAction: {
        kind: 'move',
        row: {
          childCount: 1,
          folder: {
            id: 'folder-destination',
            name: 'Destination',
            parentFolderId: 'folder:library-root',
          },
          kind: 'folder',
          label: 'Destination',
          supportingLabel: '1 item',
        },
      },
    });

    assert.equal(picker.actions[0]?.disabled, true);
    assert.equal(
      picker.actions.find((action) => {
        return action.id === 'folder-nested:open-destination';
      })?.disabled,
      true,
    );
  });
});
