import type {
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';
import type { AsyncStoragePracticeRepository } from '@org/audio-library-runtime';
import type { Dispatch, SetStateAction } from 'react';

import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../storage/local-library-storage';
import {
  createLibraryFilesIssue,
  type LibraryFilesIssue,
} from './library-files-operation-helpers';

type LibraryFilesMoveOperationsOptions = {
  buildSuggestedName: (
    parentFolderId: string,
    targetName: string,
  ) => string | null;
  practiceRepository: AsyncStoragePracticeRepository;
  setIssue: Dispatch<SetStateAction<LibraryFilesIssue | null>>;
  setTree: Dispatch<SetStateAction<RehearsalLibraryFileTree | null>>;
};

// Moving a file link or folder to another folder, and saving a folder's tags.
export const createLibraryFilesMoveOperations = ({
  buildSuggestedName,
  practiceRepository,
  setIssue,
  setTree,
}: LibraryFilesMoveOperationsOptions) => {
  return {
    async moveFileLink(optionsForMove: {
      destinationFolderId: string;
      fileLink: RehearsalLibraryFileLinkNode;
    }) {
      try {
        const nextTree = await practiceRepository.saveLibraryFileLink(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          {
            ...optionsForMove.fileLink,
            parentFolderId: optionsForMove.destinationFolderId,
          },
        );

        setTree(nextTree);
        setIssue(null);
        return {
          didComplete: true,
          issue: null,
        };
      } catch (error) {
        const issue = createLibraryFilesIssue({
          error,
          fallbackMessage:
            'The selected library files item could not be moved to that folder.',
          fallbackTitle: 'Could not move item',
          recovery(conflictingName) {
            const suggestedName = buildSuggestedName(
              optionsForMove.destinationFolderId,
              conflictingName,
            );

            return suggestedName
              ? {
                  kind: 'rename-before-retry' as const,
                  label: `Rename to "${suggestedName}"`,
                  suggestedName,
                }
              : undefined;
          },
        });

        setIssue(issue);
        return {
          didComplete: false,
          issue,
        };
      }
    },
    async moveFolder(optionsForMove: {
      destinationFolderId: string;
      folder: RehearsalLibraryFolderNode;
    }) {
      try {
        const nextTree = await practiceRepository.saveLibraryFolderNode(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          {
            ...optionsForMove.folder,
            parentFolderId: optionsForMove.destinationFolderId,
          },
        );

        setTree(nextTree);
        setIssue(null);
        return {
          didComplete: true,
          issue: null,
        };
      } catch (error) {
        const issue = createLibraryFilesIssue({
          error,
          fallbackMessage:
            'The selected library files folder could not be moved to that location.',
          fallbackTitle: 'Could not move folder',
          recovery(conflictingName) {
            const suggestedName = buildSuggestedName(
              optionsForMove.destinationFolderId,
              conflictingName,
            );

            return suggestedName
              ? {
                  kind: 'rename-before-retry' as const,
                  label: `Rename to "${suggestedName}"`,
                  suggestedName,
                }
              : undefined;
          },
        });

        setIssue(issue);
        return {
          didComplete: false,
          issue,
        };
      }
    },
    async saveFolderTags(optionsForTags: {
      folder: RehearsalLibraryFolderNode;
      tags: string[];
    }) {
      try {
        const nextTree = await practiceRepository.saveLibraryFolderNode(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          {
            ...optionsForTags.folder,
            tags: optionsForTags.tags,
          },
        );

        setTree(nextTree);
        setIssue(null);
        return {
          didComplete: true,
          issue: null,
        };
      } catch (error) {
        const issue = createLibraryFilesIssue({
          error,
          fallbackMessage:
            "The selected library files folder's tags could not be saved.",
          fallbackTitle: 'Could not save folder tags',
        });

        setIssue(issue);
        return {
          didComplete: false,
          issue,
        };
      }
    },
  };
};
