import type {
  RehearsalLibraryEntityKind,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';
import type { AsyncStoragePracticeRepository } from '@org/audio-library-runtime';
import type { Dispatch, SetStateAction } from 'react';

import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../storage/local-library-storage';
import {
  createLibraryFilesImpactReaders,
  createUniqueNodeId,
  type LibraryFilesEntityRefreshCallbacks,
  type LibraryFilesIssue,
} from './library-files-operation-helpers';

const refreshSavedEntityCollectionAfterLastLinkDelete = async (
  options: LibraryFilesEntityRefreshCallbacks,
  entityKind: RehearsalLibraryEntityKind,
) => {
  if (entityKind === 'track') {
    await Promise.all([
      options.refreshSavedSources(),
      options.refreshSavedLoops(),
      options.refreshSavedPlaylists(),
    ]);
    return;
  }

  if (entityKind === 'loop') {
    await options.refreshSavedLoops();
    return;
  }

  await options.refreshSavedPlaylists();
};

type LibraryFilesDeleteOperationsOptions = {
  options: LibraryFilesEntityRefreshCallbacks;
  practiceRepository: AsyncStoragePracticeRepository;
  setCurrentFolderId: Dispatch<SetStateAction<string | null>>;
  setOperationIssue: (title: string, message: string, error: unknown) => void;
  setIssue: Dispatch<SetStateAction<LibraryFilesIssue | null>>;
  setTree: Dispatch<SetStateAction<RehearsalLibraryFileTree | null>>;
  tree: RehearsalLibraryFileTree | null;
};

// Deleting from a folder or removing a folder, and linking an item into one.
export const createLibraryFilesDeleteOperations = ({
  options,
  practiceRepository,
  setCurrentFolderId,
  setIssue,
  setOperationIssue,
  setTree,
  tree,
}: LibraryFilesDeleteOperationsOptions) => {
  return {
    async deleteFileLink(fileLinkId: string) {
      const fileLink =
        tree?.fileLinks.find((existingFileLink) => {
          return existingFileLink.id === fileLinkId;
        }) ?? null;
      const isLastLink = fileLink
        ? createLibraryFilesImpactReaders(tree).getFileLinkDeleteImpact(
            fileLink,
          ).isLastLink
        : false;

      try {
        const nextTree = await practiceRepository.deleteLibraryFileLink(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          fileLinkId,
        );

        setTree(nextTree);
        setIssue(null);

        if (isLastLink && fileLink) {
          await refreshSavedEntityCollectionAfterLastLinkDelete(
            options,
            fileLink.entityKind,
          );
        }

        return true;
      } catch (error) {
        setOperationIssue(
          'Could not delete from folder',
          'The selected library files item could not be deleted from this folder.',
          error,
        );
        return false;
      }
    },
    async deleteFolder(folderId: string) {
      try {
        const nextTree = await practiceRepository.deleteLibraryFolderNode(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          folderId,
        );

        setTree(nextTree);
        setIssue(null);
        setCurrentFolderId((currentValue) => {
          return currentValue === folderId
            ? nextTree.rootFolderId
            : currentValue;
        });
        return true;
      } catch (error) {
        setOperationIssue(
          'Could not delete folder',
          'The selected library files folder could not be deleted.',
          error,
        );
        return false;
      }
    },
    async linkEntityToFolder(linkOptions: {
      entityId: string;
      entityKind: RehearsalLibraryEntityKind;
      parentFolderId: string;
    }) {
      try {
        const nextTree = await practiceRepository.saveLibraryFileLink(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          {
            entityId: linkOptions.entityId,
            entityKind: linkOptions.entityKind,
            id: createUniqueNodeId(
              `file-link:${linkOptions.entityKind}:${linkOptions.entityId}`,
            ),
            parentFolderId: linkOptions.parentFolderId,
          },
        );

        setTree(nextTree);
        setIssue(null);
        return true;
      } catch (error) {
        setOperationIssue(
          'Could not add item to folder',
          'The selected library files folder could not accept this item.',
          error,
        );
        return false;
      }
    },
  };
};
