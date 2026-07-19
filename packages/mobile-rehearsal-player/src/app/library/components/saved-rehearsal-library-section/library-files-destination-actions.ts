import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import type { OptionsMenuAction } from '../options-menu-sheet/model';

export type PendingLibraryFilesDestinationAction = {
  kind: 'copy' | 'move';
  row: LibraryFilesRow;
};

type BuildLibraryFilesDestinationActionsOptions = {
  currentPickerFolderId: string | null;
  files: UseLibraryFilesResult;
  isMutating: boolean;
  onOpenDestinationFolder: (folderId: string) => void;
  onSubmitDestination: (folderId: string) => void;
  pendingAction: PendingLibraryFilesDestinationAction | null;
};

export type LibraryFilesDestinationPickerState = {
  actions: OptionsMenuAction[];
  canGoToParent: boolean;
  title: string;
};

const isSameOrDescendantFolder = (options: {
  candidateFolderId: string;
  folderId: string;
  foldersById: ReadonlyMap<
    string,
    UseLibraryFilesResult['destinationFolders'][number]['folder']
  >;
}) => {
  let currentFolder = options.foldersById.get(options.candidateFolderId);

  while (currentFolder) {
    if (currentFolder.id === options.folderId) {
      return true;
    }

    currentFolder = currentFolder.parentFolderId
      ? options.foldersById.get(currentFolder.parentFolderId)
      : undefined;
  }

  return false;
};

const getDestinationDisabledReason = (options: {
  destinationFolderId: string;
  isMutating: boolean;
  pendingAction: PendingLibraryFilesDestinationAction;
  foldersById: ReadonlyMap<
    string,
    UseLibraryFilesResult['destinationFolders'][number]['folder']
  >;
}) => {
  if (options.isMutating) {
    return 'busy';
  }

  const row = options.pendingAction.row;

  if (options.pendingAction.kind !== 'move' || row.kind !== 'folder') {
    return null;
  }

  return isSameOrDescendantFolder({
    candidateFolderId: options.destinationFolderId,
    folderId: row.folder.id,
    foldersById: options.foldersById,
  })
    ? 'invalid-folder-move'
    : null;
};

export const buildLibraryFilesDestinationPicker = ({
  currentPickerFolderId,
  files,
  isMutating,
  onOpenDestinationFolder,
  onSubmitDestination,
  pendingAction,
}: BuildLibraryFilesDestinationActionsOptions): LibraryFilesDestinationPickerState => {
  if (!pendingAction) {
    return {
      actions: [],
      canGoToParent: false,
      title: 'Choose folder',
    };
  }

  const foldersById = new Map(
    files.destinationFolders.map((destination) => {
      return [destination.folder.id, destination.folder] as const;
    }),
  );
  const pickerFolderId =
    currentPickerFolderId ?? files.explorer?.currentFolder.id ?? null;
  const currentDestination = files.destinationFolders.find((destination) => {
    return destination.folder.id === pickerFolderId;
  });
  const currentFolder =
    currentDestination?.folder ?? files.destinationFolders[0]?.folder ?? null;

  if (!currentFolder) {
    return {
      actions: [],
      canGoToParent: false,
      title: 'Choose folder',
    };
  }

  const selectDisabledReason = getDestinationDisabledReason({
    destinationFolderId: currentFolder.id,
    foldersById,
    isMutating,
    pendingAction,
  });
  const childDestinations = files.destinationFolders.filter((destination) => {
    return destination.folder.parentFolderId === currentFolder.id;
  });
  const parentFolder = currentFolder.parentFolderId
    ? foldersById.get(currentFolder.parentFolderId)
    : null;
  const isCurrentFilesFolder =
    currentFolder.id === files.explorer?.currentFolder.id;
  const currentFolderContext = isCurrentFilesFolder ? ' (current folder)' : '';
  const title = `${pendingAction.kind === 'copy' ? 'Copy' : 'Move'} to ${currentFolder.name}`;
  const selectActionLabel = `${pendingAction.kind === 'copy' ? 'Copy' : 'Move'} here${currentFolderContext}`;

  return {
    actions: [
      {
        disabled: selectDisabledReason !== null,
        id: `${currentFolder.id}:select-destination`,
        label: selectActionLabel,
        onPress: () => {
          onSubmitDestination(currentFolder.id);
        },
        tone: 'primary',
      },
      ...(parentFolder
        ? [
            {
              disabled: isMutating,
              id: `${parentFolder.id}:open-parent-destination`,
              label: `Back to ${parentFolder.name}`,
              onPress: () => {
                onOpenDestinationFolder(parentFolder.id);
              },
              tone: 'secondary' as const,
            },
          ]
        : []),
      ...childDestinations.map((destination) => {
        const disabledReason = getDestinationDisabledReason({
          destinationFolderId: destination.folder.id,
          foldersById,
          isMutating,
          pendingAction,
        });

        return {
          disabled: disabledReason !== null,
          id: `${destination.folder.id}:open-destination`,
          label: destination.folder.name,
          onPress: () => {
            onOpenDestinationFolder(destination.folder.id);
          },
          tone: 'secondary' as const,
        };
      }),
    ],
    canGoToParent: Boolean(currentFolder.parentFolderId),
    title,
  };
};
