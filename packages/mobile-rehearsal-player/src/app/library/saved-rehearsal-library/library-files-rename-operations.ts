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
  resolveLibraryFilesSuggestedName,
  type LibraryFilesIssue,
  type LibraryFilesOperationResult,
  type UseLibraryFilesOptions,
} from './library-files-operation-helpers';

type LibraryFilesRenameOperationsOptions = {
  options: UseLibraryFilesOptions;
  practiceRepository: AsyncStoragePracticeRepository;
  setIssue: Dispatch<SetStateAction<LibraryFilesIssue | null>>;
  setTree: Dispatch<SetStateAction<RehearsalLibraryFileTree | null>>;
  tree: RehearsalLibraryFileTree | null;
};

export const createLibraryFilesRenameOperations = ({
  options,
  practiceRepository,
  setIssue,
  setTree,
  tree,
}: LibraryFilesRenameOperationsOptions) => {
  const buildSuggestedNameRecovery = (optionsForRecovery: {
    parentFolderId: string | null;
    targetName: string;
  }) => {
    if (!tree || !optionsForRecovery.parentFolderId) {
      return undefined;
    }

    const suggestedName = resolveLibraryFilesSuggestedName({
      entityCollections: options,
      parentFolderId: optionsForRecovery.parentFolderId,
      targetName: optionsForRecovery.targetName,
      tree,
    });

    return {
      kind: 'use-suggested-name' as const,
      label: `Use "${suggestedName}"`,
      suggestedName,
    };
  };

  return {
    async renameFileLink(optionsForRename: {
      fileLink: RehearsalLibraryFileLinkNode;
      name: string;
    }): Promise<LibraryFilesOperationResult> {
      const trimmedName = optionsForRename.name.trim();

      if (!trimmedName) {
        const issue = {
          message: 'Enter a file name.',
          title: 'File name required',
        } satisfies LibraryFilesIssue;

        setIssue(issue);
        return {
          didComplete: false,
          issue,
        };
      }

      try {
        const nextTree = await practiceRepository.saveLibraryFileLink(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          {
            ...optionsForRename.fileLink,
            visibleName: trimmedName,
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
          fallbackMessage: `The Library Files item could not be renamed to "${trimmedName}".`,
          fallbackTitle: 'Could not rename item',
          recovery(conflictingName) {
            return buildSuggestedNameRecovery({
              parentFolderId: optionsForRename.fileLink.parentFolderId,
              targetName: conflictingName,
            });
          },
        });

        setIssue(issue);
        return {
          didComplete: false,
          issue,
        };
      }
    },
    async renameFolder(optionsForRename: {
      folder: RehearsalLibraryFolderNode;
      name: string;
    }): Promise<LibraryFilesOperationResult> {
      const trimmedName = optionsForRename.name.trim();

      if (!trimmedName) {
        const issue = {
          message: 'Enter a folder name.',
          title: 'Folder name required',
        } satisfies LibraryFilesIssue;

        setIssue(issue);
        return {
          didComplete: false,
          issue,
        };
      }

      try {
        const nextTree = await practiceRepository.saveLibraryFolderNode(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          {
            ...optionsForRename.folder,
            name: trimmedName,
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
          fallbackMessage: `The Library Files folder could not be renamed to "${trimmedName}".`,
          fallbackTitle: 'Could not rename folder',
          recovery(conflictingName) {
            return buildSuggestedNameRecovery({
              parentFolderId: optionsForRename.folder.parentFolderId,
              targetName: conflictingName,
            });
          },
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
