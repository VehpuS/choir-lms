import type { DriveLibrarySourceAction } from '../../utils/drive-library-source-actions';
import type { DriveLibrarySource } from '../../utils/drive-library-view-model';

type ResolveDriveLibrarySaveActionOptions = {
  canMutateLibrary: boolean;
  onRemove: () => void;
  pendingSourceId: string | null;
  isSavedLibraryLoading: boolean;
  source: DriveLibrarySource;
};

export const resolveDriveLibrarySaveAction = ({
  canMutateLibrary,
  isSavedLibraryLoading,
  onRemove,
  pendingSourceId,
  source,
}: ResolveDriveLibrarySaveActionOptions): DriveLibrarySourceAction => {
  const isPending = pendingSourceId === source.id;
  return {
    disabled: !canMutateLibrary || isSavedLibraryLoading,
    label: isPending ? 'Removing…' : 'Remove',
    onPress: onRemove,
    placement: 'menu',
    tone: 'destructive',
  };
};
