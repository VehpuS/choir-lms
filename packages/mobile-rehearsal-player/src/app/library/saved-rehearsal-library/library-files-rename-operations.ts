import type {
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';
import type {
  AsyncStoragePracticeRepository,
  TrackRenameCopies,
} from '@org/audio-library-runtime';
import type { Dispatch, SetStateAction } from 'react';

import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../storage/local-library-storage';
import {
  createLibraryFilesIssue,
  resolveLibraryFilesSuggestedName,
  type LibraryFilesEntityRefreshCallbacks,
  type LibraryFilesIssue,
  type LibraryFilesOperationResult,
  type UseLibraryFilesOptions,
} from './library-files-operation-helpers';

type LibraryFilesRenameOperationsOptions = {
  options: UseLibraryFilesOptions & Partial<LibraryFilesEntityRefreshCallbacks>;
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
    /**
     * Renames the track entry, and the copies that follow it (see
     * `TrackRenameCopies`), as one change. `parentFolderId` is the folder of
     * the copy the user renamed, for the suggested name after a clash.
     */
    async renameTrack(optionsForRename: {
      copies: TrackRenameCopies;
      name: string;
      parentFolderId?: string;
      sourceId: string;
    }): Promise<LibraryFilesOperationResult> {
      const trimmedName = optionsForRename.name.trim();

      if (!trimmedName) {
        const issue = {
          message: 'Enter a track name.',
          title: 'Track name required',
        } satisfies LibraryFilesIssue;

        setIssue(issue);
        return { didComplete: false, issue };
      }

      try {
        const result = await practiceRepository.renameTrack(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          { ...optionsForRename, name: trimmedName },
        );

        setTree(result.tree);
        setIssue(null);
        await options.refreshSavedSources?.();
        return { didComplete: true, issue: null };
      } catch (error) {
        const issue = createLibraryFilesIssue({
          error,
          fallbackMessage: `The track could not be renamed to "${trimmedName}".`,
          fallbackTitle: 'Could not rename track',
          recovery(conflictingName) {
            return buildSuggestedNameRecovery({
              parentFolderId: optionsForRename.parentFolderId ?? null,
              targetName: conflictingName,
            });
          },
        });

        setIssue(issue);
        return { didComplete: false, issue };
      }
    },
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
          fallbackMessage: `The library files item could not be renamed to "${trimmedName}".`,
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
          fallbackMessage: `The library files folder could not be renamed to "${trimmedName}".`,
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
