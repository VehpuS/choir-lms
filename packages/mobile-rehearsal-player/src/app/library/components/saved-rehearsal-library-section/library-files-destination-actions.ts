import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import type { OptionsMenuAction } from '../options-menu-sheet/model';

export type PendingLibraryFilesDestinationAction = {
  kind: 'copy' | 'move';
  row: LibraryFilesRow;
};

type BuildLibraryFilesDestinationActionsOptions = {
  files: UseLibraryFilesResult;
  isMutating: boolean;
  onSubmitDestination: (folderId: string) => void;
  pendingAction: PendingLibraryFilesDestinationAction | null;
};

export const buildLibraryFilesDestinationActions = ({
  files,
  isMutating,
  onSubmitDestination,
  pendingAction,
}: BuildLibraryFilesDestinationActionsOptions): OptionsMenuAction[] => {
  if (!pendingAction) {
    return [];
  }

  return files.destinationFolders.map((destination) => {
    const isMovingToSelf =
      pendingAction.kind === 'move' &&
      pendingAction.row.kind === 'folder' &&
      destination.folder.id === pendingAction.row.folder.id;
    const isCurrentFolder =
      destination.folder.id === files.explorer?.currentFolder.id;

    return {
      disabled: isMovingToSelf || isMutating,
      id: destination.folder.id,
      label: isCurrentFolder
        ? `${destination.label} (current folder)`
        : destination.label,
      onPress: () => {
        onSubmitDestination(destination.folder.id);
      },
      tone: 'secondary',
    };
  });
};
