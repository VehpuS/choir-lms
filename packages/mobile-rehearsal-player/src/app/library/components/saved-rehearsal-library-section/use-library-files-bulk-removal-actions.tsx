import { useCallback, type ReactNode } from 'react';

import {
  planBulkDeleteFromFolder,
  planBulkRemoveFromLibrary,
} from '../../saved-rehearsal-library/files-bulk-node-plans';
import type { FilesSelectionItem } from '../../saved-rehearsal-library/files-selection';
import { aggregateTrackRemoveImpacts } from '../../saved-rehearsal-library/library-files-bulk-operations';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import { useLibrarySelectionServices } from '../../selection/library-selection-services';
import {
  getBulkDeleteAcknowledgment,
  getBulkDeleteFromFolderConfirmation,
  getBulkRemoveAcknowledgment,
  getBulkRemoveFromLibraryConfirmation,
} from './files-bulk-copy';
import { useLibraryFilesConfirmationFlow } from './use-library-files-confirmation-flow';

type Options = {
  files: UseLibraryFilesResult;
  /** The selection in display order. */
  items: readonly FilesSelectionItem[];
  onCompleted: () => void;
};

/**
 * The two destructive Files bulk actions (design Decision 10): each shows one
 * confirmation that sums its impact across the selection, then writes once.
 * Neither offers undo.
 */
export const useLibraryFilesBulkRemovalActions = ({
  files,
  items,
  onCompleted,
}: Options): {
  confirmationDialog: ReactNode;
  deleteFromFolder: () => void;
  removeFromLibrary: () => void;
} => {
  const services = useLibrarySelectionServices();
  const confirmationFlow = useLibraryFilesConfirmationFlow();
  const { tree } = files;

  const removeFromLibrary = useCallback(() => {
    const plan = planBulkRemoveFromLibrary(items);
    const { loops, playlists, sources } = services.collections;
    const impact = aggregateTrackRemoveImpacts({
      getImpact: files.getTrackRemoveFromLibraryImpact,
      savedSources: sources,
      sourceIds: plan.sourceIds,
    });
    const nameOf = <T extends { id: string; name: string }>(
      collection: readonly T[],
      id: string,
    ) => collection.find((entry) => entry.id === id)?.name ?? id;

    confirmationFlow.requestConfirmation({
      content: getBulkRemoveFromLibraryConfirmation({
        impact,
        names: {
          loops: plan.loopIds.map((id) => nameOf(loops, id)),
          playlists: plan.playlistIds.map((id) => nameOf(playlists, id)),
          tracks: plan.sourceIds.map((id) => nameOf(sources, id)),
        },
        plan,
      }),
      onConfirm: async () => {
        const result = await files.bulk.removeFromLibrary(plan);

        if (result.didComplete) {
          services.acknowledge(getBulkRemoveAcknowledgment(plan));
          onCompleted();
        }
      },
    });
  }, [confirmationFlow, files, items, onCompleted, services]);

  const deleteFromFolder = useCallback(() => {
    if (!tree) {
      return;
    }

    const plan = planBulkDeleteFromFolder(items, tree);

    confirmationFlow.requestConfirmation({
      content: getBulkDeleteFromFolderConfirmation(plan),
      onConfirm: async () => {
        const result = await files.bulk.deleteNodes(plan);

        if (result.didComplete) {
          services.acknowledge(getBulkDeleteAcknowledgment(plan));
          onCompleted();
        }
      },
    });
  }, [confirmationFlow, files, items, onCompleted, services, tree]);

  return {
    confirmationDialog: confirmationFlow.confirmationDialog,
    deleteFromFolder,
    removeFromLibrary,
  };
};
