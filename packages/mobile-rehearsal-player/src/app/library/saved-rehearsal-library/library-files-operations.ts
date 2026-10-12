import type {
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';
import {
  AsyncStoragePracticeRepository,
  resolveRehearsalLibraryCopyVisibleName,
} from '@org/audio-library-runtime';
import type { Dispatch, SetStateAction } from 'react';

import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../storage/local-library-storage';
import type { LibraryFilesExplorerState } from './library-files-model';
import {
  createLibraryFilesImpactReaders,
  createLibraryFilesIssue,
  createUniqueNodeId,
  type LibraryFilesEntityRefreshCallbacks,
  type LibraryFilesIssue,
  type LibraryFilesOperationResult,
  resolveLibraryFilesSuggestedName,
  type UseLibraryFilesOptions,
} from './library-files-operation-helpers';
import { createLibraryFilesDeleteOperations } from './library-files-delete-operations';
import { createLibraryFilesMoveOperations } from './library-files-move-operations';
import { createLibraryFilesRenameOperations } from './library-files-rename-operations';
import { getTrackRemoveFromLibraryImpact } from './library-files-removal-impact';

type LibraryFilesOperationsOptions = {
  explorer: LibraryFilesExplorerState | null;
  options: UseLibraryFilesOptions & LibraryFilesEntityRefreshCallbacks;
  practiceRepository: AsyncStoragePracticeRepository;
  setCurrentFolderId: Dispatch<SetStateAction<string | null>>;
  setIssue: Dispatch<SetStateAction<LibraryFilesIssue | null>>;
  setTree: Dispatch<SetStateAction<RehearsalLibraryFileTree | null>>;
  tree: RehearsalLibraryFileTree | null;
};

export const createLibraryFilesOperations = ({
  explorer,
  options,
  practiceRepository,
  setCurrentFolderId,
  setIssue,
  setTree,
  tree,
}: LibraryFilesOperationsOptions) => {
  const entityCollections = {
    savedLoops: options.savedLoops,
    savedPlaylists: options.savedPlaylists,
    savedSources: options.savedSources,
  } satisfies UseLibraryFilesOptions;

  const buildSuggestedName = (parentFolderId: string, targetName: string) => {
    if (!tree) {
      return null;
    }

    return resolveLibraryFilesSuggestedName({
      entityCollections,
      parentFolderId,
      targetName,
      tree,
    });
  };

  const setOperationIssue = (
    title: string,
    message: string,
    error: unknown,
  ) => {
    setIssue(
      createLibraryFilesIssue({
        error,
        fallbackMessage: message,
        fallbackTitle: title,
      }),
    );
  };

  return {
    ...createLibraryFilesImpactReaders(tree),
    ...createLibraryFilesRenameOperations({
      options,
      practiceRepository,
      setIssue,
      setTree,
      tree,
    }),
    getTrackRemoveFromLibraryImpact(sourceId: string) {
      return getTrackRemoveFromLibraryImpact(tree, options, sourceId);
    },
    async createFolder(name: string): Promise<LibraryFilesOperationResult> {
      if (!tree) {
        return {
          didComplete: false,
          issue: null,
        };
      }

      const trimmedName = name.trim();

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
            id: createUniqueNodeId('folder'),
            name: trimmedName,
            parentFolderId: explorer?.currentFolder.id ?? tree.rootFolderId,
            createdAt: new Date().toISOString(),
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
          fallbackMessage: `The folder "${trimmedName}" could not be created in the current library files location.`,
          fallbackTitle: 'Could not create folder',
          recovery(conflictingName) {
            const suggestedName = buildSuggestedName(
              explorer?.currentFolder.id ?? tree.rootFolderId,
              conflictingName,
            );

            return suggestedName
              ? {
                  kind: 'use-suggested-name' as const,
                  label: `Use "${suggestedName}"`,
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
    async createFileLinkCopy(optionsForCopy: {
      destinationFolderId: string;
      fileLink: RehearsalLibraryFileLinkNode;
      sourceName: string;
      visibleName?: string;
    }) {
      if (!tree) {
        return {
          didComplete: false,
          issue: null,
        };
      }

      try {
        const visibleName =
          optionsForCopy.visibleName ??
          resolveRehearsalLibraryCopyVisibleName({
            entityCollections: {
              loops: options.savedLoops,
              playlists: options.savedPlaylists,
              sources: options.savedSources,
            },
            parentFolderId: optionsForCopy.destinationFolderId,
            sourceName: optionsForCopy.sourceName,
            tree,
          });
        const nextTree = await practiceRepository.saveLibraryFileLink(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          {
            entityId: optionsForCopy.fileLink.entityId,
            entityKind: optionsForCopy.fileLink.entityKind,
            id: createUniqueNodeId(
              `file-link:${optionsForCopy.fileLink.entityKind}:${optionsForCopy.fileLink.entityId}:copy`,
            ),
            parentFolderId: optionsForCopy.destinationFolderId,
            visibleName,
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
          fallbackMessage: `The item "${optionsForCopy.sourceName}" could not be copied to the selected folder.`,
          fallbackTitle: 'Could not create copy',
          recovery(conflictingName) {
            const suggestedName = buildSuggestedName(
              optionsForCopy.destinationFolderId,
              conflictingName,
            );

            return suggestedName
              ? {
                  kind: 'retry-copy-with-suggested-name' as const,
                  label: `Keep both as "${suggestedName}"`,
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
    ...createLibraryFilesDeleteOperations({
      options,
      practiceRepository,
      setCurrentFolderId,
      setIssue,
      setOperationIssue,
      setTree,
      tree,
    }),
    ...createLibraryFilesMoveOperations({
      buildSuggestedName,
      practiceRepository,
      setIssue,
      setTree,
    }),
  };
};
