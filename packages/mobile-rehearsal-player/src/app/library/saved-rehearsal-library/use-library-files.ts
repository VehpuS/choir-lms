import type {
  RehearsalLibraryEntityKind,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';
import { AsyncStoragePracticeRepository } from '@org/audio-library-runtime';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
  verifyLocalLibraryStorage,
} from '../storage/local-library-storage';
import {
  buildLibraryFilesExplorerState,
  buildLibraryFolderPathLabel,
  type LibraryFilesSearchOptions,
} from './library-files-model';
import {
  formatLibraryFilesIssue,
  type LibraryFilesEntityRefreshCallbacks,
  type LibraryFilesIssue,
  type UseLibraryFilesOptions,
} from './library-files-operation-helpers';
import { createLibraryFilesOperations } from './library-files-operations';

const practiceRepository = new AsyncStoragePracticeRepository();

const STORAGE_UNAVAILABLE_ISSUE: LibraryFilesIssue = {
  message:
    'This build could not access the device storage needed for Library Files.',
  title: 'Library Files unavailable',
};

const buildCanonicalIdsKey = (options: UseLibraryFilesOptions) => {
  return [
    options.savedSources
      .map((source) => {
        return source.id;
      })
      .join('|'),
    options.savedLoops
      .map((loop) => {
        return loop.id;
      })
      .join('|'),
    options.savedPlaylists
      .map((playlist) => {
        return playlist.id;
      })
      .join('|'),
  ].join('::');
};

export type UseLibraryFilesResult = ReturnType<typeof useLibraryFiles>;

export const useLibraryFiles = (
  options: UseLibraryFilesOptions & LibraryFilesEntityRefreshCallbacks,
) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [issue, setIssue] = useState<LibraryFilesIssue | null>(null);
  const [pendingDriveImportFolderId, setPendingDriveImportFolderId] = useState<
    string | null
  >(null);
  const pendingDriveImportFolderIdRef = useRef<string | null>(null);
  const [tree, setTree] = useState<RehearsalLibraryFileTree | null>(null);
  const canonicalIdsKey = useMemo(() => {
    return buildCanonicalIdsKey(options);
  }, [options]);

  const refresh = async () => {
    const storageReady = await verifyLocalLibraryStorage();

    if (!storageReady) {
      setIssue(STORAGE_UNAVAILABLE_ISSUE);
      setIsLoading(false);
      return null;
    }

    try {
      const nextTree = await practiceRepository.listLibraryFileTree(
        LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
      );

      setTree(nextTree);
      setIssue(null);
      setIsLoading(false);
      setCurrentFolderId((currentValue) => {
        if (!currentValue) {
          return nextTree.rootFolderId;
        }

        return nextTree.folders.some((folder) => folder.id === currentValue)
          ? currentValue
          : nextTree.rootFolderId;
      });

      return nextTree;
    } catch (error) {
      setIssue(
        formatLibraryFilesIssue(
          'Could not load Library Files',
          'The Library Files explorer could not load the current file tree.',
          error,
        ),
      );
      setIsLoading(false);
      return null;
    }
  };

  useEffect(() => {
    void refresh();
  }, [canonicalIdsKey]);

  const resolveExplorerState = (searchOptions?: LibraryFilesSearchOptions) => {
    if (!tree) {
      return null;
    }

    return buildLibraryFilesExplorerState({
      currentFolderId: currentFolderId ?? tree.rootFolderId,
      savedLoops: options.savedLoops,
      savedPlaylists: options.savedPlaylists,
      savedSources: options.savedSources,
      searchOptions,
      tree,
    });
  };

  const explorer = useMemo(() => {
    return resolveExplorerState();
  }, [currentFolderId, options, tree]);

  const destinationFolders = useMemo(() => {
    if (!tree) {
      return [];
    }

    const foldersById = new Map(
      tree.folders.map((folder) => {
        return [folder.id, folder] as const;
      }),
    );

    return tree.folders.map((folder) => {
      return {
        folder,
        label: buildLibraryFolderPathLabel(foldersById, folder),
      };
    });
  }, [tree]);

  const operations = createLibraryFilesOperations({
    explorer,
    options,
    practiceRepository,
    setCurrentFolderId,
    setIssue,
    setTree,
    tree,
  });

  return {
    clearIssue() {
      setIssue(null);
    },
    clearPendingDriveImportFolderId() {
      pendingDriveImportFolderIdRef.current = null;
      setPendingDriveImportFolderId(null);
    },
    consumePendingDriveImportFolderId() {
      const stagedFolderId = pendingDriveImportFolderIdRef.current;

      pendingDriveImportFolderIdRef.current = null;
      setPendingDriveImportFolderId(null);

      return stagedFolderId;
    },
    createFileLinkCopy: operations.createFileLinkCopy,
    createFolder: operations.createFolder,
    deleteFileLink: operations.deleteFileLink,
    deleteFolder: operations.deleteFolder,
    destinationFolders,
    explorer,
    fileLinks: tree?.fileLinks ?? [],
    folders: tree?.folders ?? [],
    resolveExplorerState,
    getFileLinkDeleteImpact: operations.getFileLinkDeleteImpact,
    getFolderDeleteImpact: operations.getFolderDeleteImpact,
    getTrackRemoveFromLibraryImpact: operations.getTrackRemoveFromLibraryImpact,
    goToFolder(folderId: string) {
      setCurrentFolderId(folderId);
    },
    goToParentFolder() {
      const parentFolderId = explorer?.currentFolder.parentFolderId;

      if (!parentFolderId) {
        return;
      }

      setCurrentFolderId(parentFolderId);
    },
    isLoading,
    issue,
    async linkEntityToCurrentFolder(
      entityKind: RehearsalLibraryEntityKind,
      entityId: string,
    ) {
      const parentFolderId = explorer?.currentFolder.id ?? tree?.rootFolderId;

      if (!parentFolderId) {
        return false;
      }

      return operations.linkEntityToFolder({
        entityId,
        entityKind,
        parentFolderId,
      });
    },
    linkEntityToFolder: operations.linkEntityToFolder,
    moveFileLink: operations.moveFileLink,
    moveFolder: operations.moveFolder,
    openFolder(folderId: string) {
      setCurrentFolderId(folderId);
    },
    pendingDriveImportFolderId,
    refresh,
    rootFolderId: tree?.rootFolderId ?? null,
    renameFileLink: operations.renameFileLink,
    renameFolder: operations.renameFolder,
    saveFolderTags: operations.saveFolderTags,
    stageDriveImportForCurrentFolder() {
      const stagedFolderId =
        explorer?.currentFolder.id ?? tree?.rootFolderId ?? null;

      pendingDriveImportFolderIdRef.current = stagedFolderId;
      setPendingDriveImportFolderId(stagedFolderId);
    },
  };
};
