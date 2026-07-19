import type {
  NamedLoop,
  Playlist,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';
import { REHEARSAL_LIBRARY_ROOT_FOLDER_ID } from '@org/audio-library-runtime';

import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';

export type LibraryFilesIssue = {
  message: string;
  title: string;
};

export type UseLibraryFilesOptions = {
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
  savedSources: DriveLibrarySource[];
};

export const formatLibraryFilesIssue = (
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

export const createUniqueNodeId = (prefix: string) => {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
};

const collectFolderSubtreeIds = (
  tree: RehearsalLibraryFileTree,
  folderId: string,
) => {
  const folderIds = new Set<string>([folderId]);
  const pendingFolderIds = [folderId];

  while (pendingFolderIds.length > 0) {
    const currentFolderId = pendingFolderIds.pop();

    if (!currentFolderId) {
      continue;
    }

    for (const folder of tree.folders) {
      if (
        folder.parentFolderId !== currentFolderId ||
        folderIds.has(folder.id)
      ) {
        continue;
      }

      folderIds.add(folder.id);
      pendingFolderIds.push(folder.id);
    }
  }

  return folderIds;
};

const isLastLibraryFileLink = (
  tree: RehearsalLibraryFileTree,
  folderIds: ReadonlySet<string>,
  fileLink: RehearsalLibraryFileLinkNode,
) => {
  return !tree.fileLinks.some((existingFileLink) => {
    return (
      !folderIds.has(existingFileLink.parentFolderId) &&
      existingFileLink.entityKind === fileLink.entityKind &&
      existingFileLink.entityId === fileLink.entityId
    );
  });
};

export const createLibraryFilesImpactReaders = (
  tree: RehearsalLibraryFileTree | null,
) => {
  return {
    getFileLinkDeleteImpact(fileLink: RehearsalLibraryFileLinkNode) {
      const linkCount =
        tree?.fileLinks.filter((existingFileLink) => {
          return (
            existingFileLink.entityKind === fileLink.entityKind &&
            existingFileLink.entityId === fileLink.entityId
          );
        }).length ?? 0;

      return {
        isLastLink: linkCount <= 1,
      };
    },
    getFolderDeleteImpact(folderId: string) {
      if (!tree) {
        return null;
      }

      const folderIds = collectFolderSubtreeIds(tree, folderId);
      const removedFileLinks = tree.fileLinks.filter((fileLink) => {
        return folderIds.has(fileLink.parentFolderId);
      });
      const lastLinkCount = removedFileLinks.filter((fileLink) => {
        return isLastLibraryFileLink(tree, folderIds, fileLink);
      }).length;

      return {
        folderCount: Math.max(folderIds.size - 1, 0),
        isRootFolder: folderId === REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
        lastLinkCount,
        loopLinkCount: removedFileLinks.filter((fileLink) => {
          return fileLink.entityKind === 'loop';
        }).length,
        playlistLinkCount: removedFileLinks.filter((fileLink) => {
          return fileLink.entityKind === 'playlist';
        }).length,
        trackLinkCount: removedFileLinks.filter((fileLink) => {
          return fileLink.entityKind === 'track';
        }).length,
      };
    },
  };
};
