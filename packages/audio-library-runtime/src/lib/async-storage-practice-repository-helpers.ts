import {
  isNamedLoop,
  type DriveAudioSource,
  type NamedLoop,
  type RehearsalLibraryFileTree,
} from '@org/audio-library-models';

import { writeStoredLibraryFileTree } from './practice-repository-storage';
import {
  REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
  removeRehearsalLibraryFileLinkNode,
} from './rehearsal-library-files';

type LibraryFolderDeletionRepository = {
  deleteLoop(ownerId: string, loopId: string): Promise<NamedLoop[]>;
  deletePlaylist(ownerId: string, playlistId: string): Promise<unknown[]>;
  deleteSource(ownerId: string, sourceId: string): Promise<DriveAudioSource[]>;
  deleteLibraryFileLink(
    ownerId: string,
    fileLinkId: string,
  ): Promise<RehearsalLibraryFileTree>;
  listLibraryFileTree(ownerId: string): Promise<RehearsalLibraryFileTree>;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const hasNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

const normalizeStoredLoop = (options: {
  loop: unknown;
  sourceNameById: ReadonlyMap<string, string>;
}): NamedLoop | null => {
  if (!isRecord(options.loop) || !hasNonEmptyString(options.loop.sourceId)) {
    return null;
  }

  const sourceName =
    options.sourceNameById.get(options.loop.sourceId) ??
    (hasNonEmptyString(options.loop.sourceName)
      ? options.loop.sourceName
      : null);

  if (!sourceName) {
    return null;
  }

  const normalizedLoop = {
    ...options.loop,
    sourceId: options.loop.sourceId,
    sourceName,
  };

  return isNamedLoop(normalizedLoop) ? normalizedLoop : null;
};

export const normalizeStoredLoops = (options: {
  loops: unknown[];
  sources: DriveAudioSource[];
}) => {
  const sourceNameById = new Map(
    options.sources.map((source) => {
      return [source.id, source.name] as const;
    }),
  );

  return options.loops.flatMap((loop) => {
    const normalizedLoop = normalizeStoredLoop({
      loop,
      sourceNameById,
    });

    return normalizedLoop ? [normalizedLoop] : [];
  });
};

export const collectLibraryFolderSubtreeIds = (
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

export const deleteLibraryFileLinkFromRepository = async (
  repository: LibraryFolderDeletionRepository,
  ownerId: string,
  fileLinkId: string,
) => {
  const tree = await repository.listLibraryFileTree(ownerId);
  const fileLink = tree.fileLinks.find((existingFileLink) => {
    return existingFileLink.id === fileLinkId;
  });

  if (!fileLink) {
    return tree;
  }

  const hasAdditionalLinks = tree.fileLinks.some((existingFileLink) => {
    return (
      existingFileLink.id !== fileLinkId &&
      existingFileLink.entityKind === fileLink.entityKind &&
      existingFileLink.entityId === fileLink.entityId
    );
  });

  if (hasAdditionalLinks) {
    return writeStoredLibraryFileTree(
      ownerId,
      removeRehearsalLibraryFileLinkNode(tree, fileLinkId),
    );
  }

  if (fileLink.entityKind === 'track') {
    await repository.deleteSource(ownerId, fileLink.entityId);
  } else if (fileLink.entityKind === 'loop') {
    await repository.deleteLoop(ownerId, fileLink.entityId);
  } else {
    await repository.deletePlaylist(ownerId, fileLink.entityId);
  }

  return repository.listLibraryFileTree(ownerId);
};

export const deleteLibraryFolderNodeFromRepository = async (
  repository: LibraryFolderDeletionRepository,
  ownerId: string,
  folderId: string,
) => {
  if (folderId === REHEARSAL_LIBRARY_ROOT_FOLDER_ID) {
    throw new Error('The root library folder cannot be deleted.');
  }

  const tree = await repository.listLibraryFileTree(ownerId);
  const folder = tree.folders.find((existingFolder) => {
    return existingFolder.id === folderId;
  });

  if (!folder) {
    return tree;
  }

  const removedFolderIds = collectLibraryFolderSubtreeIds(tree, folderId);
  const removedFileLinks = tree.fileLinks.filter((fileLink) => {
    return removedFolderIds.has(fileLink.parentFolderId);
  });

  for (const fileLink of removedFileLinks) {
    await repository.deleteLibraryFileLink(ownerId, fileLink.id);
  }

  const synchronizedTree = await repository.listLibraryFileTree(ownerId);

  return writeStoredLibraryFileTree(ownerId, {
    ...synchronizedTree,
    fileLinks: synchronizedTree.fileLinks.filter((fileLink) => {
      return !removedFolderIds.has(fileLink.parentFolderId);
    }),
    folders: synchronizedTree.folders.filter((existingFolder) => {
      return !removedFolderIds.has(existingFolder.id);
    }),
  });
};
