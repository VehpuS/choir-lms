import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import type { OptionsMenuAction } from '../options-menu-sheet/model';
import { attachRowActionSections } from '../options-menu-sheet/row-action-sections';
import {
  resolveLoopMenuActions,
  resolveTrackMenuActions,
} from './files-playable-row-actions';
import {
  FOLDER_ACTION_ORDER,
  PLAYLIST_ACTION_ORDER,
  getDeleteFromFolderConfirmationCopy,
  getTrackRemoveFromLibraryPlacementLabel,
  sortActionsByLabelOrder,
} from './files-row-actions-contract';
import type { ResolveFilesRowMenuActionsBaseOptions } from './files-row-actions-model';

const resolvePlaylistMenuActions = (
  options: ResolveFilesRowMenuActionsBaseOptions,
  row: Extract<LibraryFilesRow, { kind: 'playlist' }>,
) => {
  const actions = [
    {
      disabled: !options.canMutatePlaylists || options.isPlaylistMutating,
      id: `playlist:${row.fileLink.id}:add-items`,
      label: 'Add items',
      onPress: () => {
        options.onOpenPlaylistAddItems(row.playlist.id);
      },
      tone: 'secondary' as const,
    },
    {
      disabled: !options.canMutateLibrary || options.isSavedLibraryMutating,
      id: `playlist:${row.fileLink.id}:create-copy`,
      label: 'Create a copy',
      onPress: () => {
        options.onCreateFileLinkCopy(row);
      },
    },
    {
      disabled: !options.canMutatePlaylists || options.isPlaylistMutating,
      id: `playlist:${row.fileLink.id}:edit-tags`,
      label: 'Edit tags',
      onPress: () => {
        options.onOpenPlaylistTagEditor(row.playlist.id);
      },
      tone: 'secondary' as const,
    },
    {
      disabled: !options.canMutateLibrary || options.isSavedLibraryMutating,
      id: `playlist:${row.fileLink.id}:rename`,
      label: 'Rename',
      onPress: () => {
        options.onRenameFileNode(row);
      },
    },
    {
      disabled: !options.canMutateLibrary || options.isSavedLibraryMutating,
      id: `playlist:${row.fileLink.id}:move-to-folder`,
      label: 'Move to folder',
      onPress: () => {
        options.onMoveFileNode(row);
      },
    },
    {
      disabled: !options.canMutateLibrary || options.isSavedLibraryMutating,
      id: `playlist:${row.fileLink.id}:delete-from-folder`,
      label: 'Delete from folder',
      onPress: () => {
        options.onDeleteFileNode(row);
      },
      tone: 'destructive' as const,
    },
  ];

  return attachRowActionSections(
    sortActionsByLabelOrder(actions, PLAYLIST_ACTION_ORDER),
  );
};

const resolveFolderMenuActions = (
  options: ResolveFilesRowMenuActionsBaseOptions,
  row: Extract<LibraryFilesRow, { kind: 'folder' }>,
) => {
  const actions = [
    {
      disabled: !options.canMutateLibrary || options.isSavedLibraryMutating,
      id: `folder:${row.folder.id}:edit-tags`,
      label: 'Edit tags',
      onPress: () => {
        options.onOpenFolderTagEditor(row.folder.id);
      },
      tone: 'secondary' as const,
    },
    {
      disabled: !options.canMutateLibrary || options.isSavedLibraryMutating,
      id: `folder:${row.folder.id}:rename`,
      label: 'Rename',
      onPress: () => {
        options.onRenameFileNode(row);
      },
    },
    {
      disabled: !options.canMutateLibrary || options.isSavedLibraryMutating,
      id: `folder:${row.folder.id}:move-to-folder`,
      label: 'Move to folder',
      onPress: () => {
        options.onMoveFileNode(row);
      },
    },
    {
      disabled: !options.canMutateLibrary || options.isSavedLibraryMutating,
      id: `folder:${row.folder.id}:delete-from-folder`,
      label: 'Delete from folder',
      onPress: () => {
        options.onDeleteFileNode(row);
      },
      tone: 'destructive' as const,
    },
  ];

  return attachRowActionSections(
    sortActionsByLabelOrder(actions, FOLDER_ACTION_ORDER),
  );
};

export const resolveFilesRowMenuActions = (
  options: ResolveFilesRowMenuActionsBaseOptions & {
    row: LibraryFilesRow;
  },
): OptionsMenuAction[] => {
  switch (options.row.kind) {
    case 'folder':
      return resolveFolderMenuActions(options, options.row);
    case 'loop':
      return resolveLoopMenuActions(options, options.row);
    case 'playlist':
      return resolvePlaylistMenuActions(options, options.row);
    case 'track':
      return resolveTrackMenuActions(options, options.row);
  }
};

export const resolveFilesRowMenuTitle = (row: LibraryFilesRow) => {
  if (row.kind === 'folder') {
    return row.folder.name;
  }

  return row.label;
};

export {
  getDeleteFromFolderConfirmationCopy,
  getTrackRemoveFromLibraryPlacementLabel,
};
