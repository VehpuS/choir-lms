import type {
  NamedLoop,
  Playlist,
  RehearsalLibraryEntityKind,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';
import { AsyncStoragePracticeRepository } from '@org/audio-library-runtime';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';
import {
  LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
  verifyLocalLibraryStorage,
} from '../storage/local-library-storage';
import { buildLibraryFilesExplorerState } from './library-files-model';

type LibraryFilesIssue = {
  message: string;
  title: string;
};

type UseLibraryFilesOptions = {
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
  savedSources: DriveLibrarySource[];
};

const practiceRepository = new AsyncStoragePracticeRepository();

const STORAGE_UNAVAILABLE_ISSUE: LibraryFilesIssue = {
  message:
    'This build could not access the device storage needed for Library Files.',
  title: 'Library Files unavailable',
};

const formatLibraryFilesIssue = (
  fallbackTitle: string,
  fallbackMessage: string,
  error: unknown,
): LibraryFilesIssue => {
  const detail = error instanceof Error ? error.message.trim() : '';

  return {
    message: detail ? `${fallbackMessage} ${detail}` : fallbackMessage,
    title: fallbackTitle,
  };
};

const createUniqueNodeId = (prefix: string) => {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
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

export const useLibraryFiles = (options: UseLibraryFilesOptions) => {
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

  const explorer = useMemo(() => {
    if (!tree) {
      return null;
    }

    return buildLibraryFilesExplorerState({
      currentFolderId: currentFolderId ?? tree.rootFolderId,
      savedLoops: options.savedLoops,
      savedPlaylists: options.savedPlaylists,
      savedSources: options.savedSources,
      tree,
    });
  }, [currentFolderId, options, tree]);

  const linkEntityToFolder = async (linkOptions: {
    entityId: string;
    entityKind: RehearsalLibraryEntityKind;
    parentFolderId: string;
  }) => {
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
      setIssue(
        formatLibraryFilesIssue(
          'Could not add item to folder',
          'The selected Library Files folder could not accept this item.',
          error,
        ),
      );
      return false;
    }
  };

  return {
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
    async createFolder(name: string) {
      if (!tree) {
        return false;
      }

      const trimmedName = name.trim();

      if (!trimmedName) {
        setIssue({
          message: 'Enter a folder name.',
          title: 'Folder name required',
        });
        return false;
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
        return true;
      } catch (error) {
        setIssue(
          formatLibraryFilesIssue(
            'Could not create folder',
            `The folder "${trimmedName}" could not be created in the current Library Files location.`,
            error,
          ),
        );
        return false;
      }
    },
    explorer,
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

      return linkEntityToFolder({
        entityId,
        entityKind,
        parentFolderId,
      });
    },
    linkEntityToFolder,
    openFolder(folderId: string) {
      setCurrentFolderId(folderId);
    },
    pendingDriveImportFolderId,
    refresh,
    rootFolderId: tree?.rootFolderId ?? null,
    stageDriveImportForCurrentFolder() {
      const stagedFolderId =
        explorer?.currentFolder.id ?? tree?.rootFolderId ?? null;

      pendingDriveImportFolderIdRef.current = stagedFolderId;
      setPendingDriveImportFolderId(stagedFolderId);
    },
  };
};
