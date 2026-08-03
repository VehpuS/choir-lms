import type {
  RehearsalLibraryEntityKind,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
  RehearsalLibraryFolderNode,
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
  type LibraryFilesIssue,
  resolveLibraryFilesSuggestedName,
  type UseLibraryFilesOptions,
} from './library-files-operation-helpers';
import { createLibraryFilesRenameOperations } from './library-files-rename-operations';

type LibraryFilesOperationsOptions = {
  explorer: LibraryFilesExplorerState | null;
  options: UseLibraryFilesOptions;
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
      const foldersById = new Map(
        tree?.folders.map((folder) => {
          return [folder.id, folder] as const;
        }) ?? [],
      );
      const source = options.savedSources.find((savedSource) => {
        return savedSource.id === sourceId;
      });
      const fileLinks =
        tree?.fileLinks.filter((fileLink) => {
          return (
            fileLink.entityKind === 'track' && fileLink.entityId === sourceId
          );
        }) ?? [];
      const loops = options.savedLoops.filter((loop) => {
        return loop.sourceId === sourceId;
      });
      const playlistEntries = options.savedPlaylists.flatMap((playlist) => {
        return playlist.items
          .filter((item) => {
            return item.sourceId === sourceId;
          })
          .map((item) => {
            return `${playlist.name}: ${item.title}`;
          });
      });

      return {
        fileLinkCount: fileLinks.length,
        fileLinkNames: fileLinks.map((fileLink) => {
          const displayName = fileLink.visibleName ?? source?.name ?? 'Track';
          const folderName = foldersById.get(fileLink.parentFolderId)?.name;

          return folderName ? `${displayName} (${folderName})` : displayName;
        }),
        loopCount: loops.length,
        loopNames: loops.map((loop) => loop.name),
        playlistEntryCount: playlistEntries.length,
        playlistEntryTitles: playlistEntries,
      };
    },
    async createFolder(name: string) {
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
          fallbackMessage: `The folder "${trimmedName}" could not be created in the current Library Files location.`,
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
    async deleteFileLink(fileLinkId: string) {
      try {
        const nextTree = await practiceRepository.deleteLibraryFileLink(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          fileLinkId,
        );

        setTree(nextTree);
        setIssue(null);
        return true;
      } catch (error) {
        setOperationIssue(
          'Could not delete from folder',
          'The selected Library Files item could not be deleted from this folder.',
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
          'The selected Library Files folder could not be deleted.',
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
          'The selected Library Files folder could not accept this item.',
          error,
        );
        return false;
      }
    },
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
            'The selected Library Files item could not be moved to that folder.',
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
            'The selected Library Files folder could not be moved to that location.',
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
  };
};
