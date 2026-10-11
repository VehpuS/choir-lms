import type { RehearsalLibraryFileTree } from '@org/audio-library-models';
import type { AsyncStoragePracticeRepository } from '@org/audio-library-runtime';
import type { Dispatch, SetStateAction } from 'react';

import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../storage/local-library-storage';
import type {
  BulkOperationResult,
  PlacedNodes,
} from './library-files-bulk-operations';
import type { BulkDeleteFromFolderPlan } from './files-bulk-node-plans';
import {
  createLibraryFilesIssue,
  type LibraryFilesIssue,
} from './library-files-operation-helpers';

type Options = {
  practiceRepository: AsyncStoragePracticeRepository;
  refreshAllEntities: () => Promise<void>;
  setIssue: Dispatch<SetStateAction<LibraryFilesIssue | null>>;
  setTree: Dispatch<SetStateAction<RehearsalLibraryFileTree | null>>;
  tree: RehearsalLibraryFileTree | null;
};

/**
 * The bulk operations that finish or reverse a placement: deleting selected
 * folders and links together, and undoing a copy or move from the completion
 * acknowledgment (design 9.0: non-destructive batch changes offer undo).
 */
export const createLibraryFilesBulkNodeOperations = ({
  practiceRepository,
  refreshAllEntities,
  setIssue,
  setTree,
  tree,
}: Options) => {
  const settle = (
    nextTree: RehearsalLibraryFileTree,
    placedCount: number,
  ): BulkOperationResult => {
    setTree(nextTree);
    setIssue(null);

    return {
      didComplete: true,
      issue: null,
      placedCount,
      previousTree: tree,
      skippedCount: 0,
    };
  };
  const fail = (title: string, error: unknown): BulkOperationResult => {
    const issue = createLibraryFilesIssue({
      error,
      fallbackMessage: 'Some items may not have been changed.',
      fallbackTitle: title,
    });

    setIssue(issue);

    return {
      didComplete: false,
      issue,
      placedCount: 0,
      previousTree: tree,
      skippedCount: 0,
    };
  };

  return {
    /**
     * `Delete from folder` for folders and links together. The links go in one
     * write with the last-link cascade; the now-empty folders follow. A failure
     * between the two leaves empty folders, never half-deleted contents.
     */
    async deleteNodes(
      plan: BulkDeleteFromFolderPlan,
    ): Promise<BulkOperationResult> {
      try {
        let nextTree = tree;

        if (plan.fileLinkIds.length > 0) {
          ({ tree: nextTree } = await practiceRepository.removeLibraryFileLinks(
            LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
            plan.fileLinkIds,
          ));
        }

        for (const folderId of plan.topFolderIds) {
          nextTree = await practiceRepository.deleteLibraryFolderNode(
            LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
            folderId,
          );
        }

        const result = settle(
          nextTree ??
            (await practiceRepository.listLibraryFileTree(
              LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
            )),
          plan.selectedFolderCount + plan.selectedLinkCount,
        );

        await refreshAllEntities();
        return result;
      } catch (error) {
        return fail('Could not delete from folder', error);
      }
    },
    /** Reverses a copy (removes the new links) or a move (restores the nodes). */
    async undoPlacement(placed: PlacedNodes): Promise<BulkOperationResult> {
      try {
        if (placed.mode === 'copy') {
          const { tree: nextTree } =
            await practiceRepository.removeLibraryFileLinks(
              LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
              placed.fileLinkIds,
            );

          return settle(nextTree, placed.fileLinkIds.length);
        }

        const nextTree = await practiceRepository.saveLibraryNodes(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          {
            fileLinks: placed.originals.flatMap((item) =>
              item.kind === 'link' ? [item.fileLink] : [],
            ),
            folders: placed.originals.flatMap((item) =>
              item.kind === 'folder' ? [item.folder] : [],
            ),
          },
        );

        return settle(nextTree, placed.originals.length);
      } catch (error) {
        return fail('Could not undo', error);
      }
    },
  };
};
