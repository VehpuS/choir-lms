import type {
  NamedLoop,
  Playlist,
  RehearsalLibraryEntityKind,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';
import { REHEARSAL_LIBRARY_ROOT_FOLDER_ID } from '@org/audio-library-runtime';

import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';

const COPY_NAME_SUFFIX_PATTERN = /^(.*?)( Copy(?: (\d+))?)?$/i;
const DUPLICATE_NAME_CONFLICT_PATTERN =
  /^An item named "(.+)" already exists in the target folder\.?$/i;

export type UseLibraryFilesOptions = {
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
  savedSources: DriveLibrarySource[];
};

export type LibraryFilesIssueRecovery =
  | {
      kind: 'rename-before-retry';
      label: string;
      suggestedName: string;
    }
  | {
      kind: 'retry-copy-with-suggested-name';
      label: string;
      suggestedName: string;
    }
  | {
      kind: 'use-suggested-name';
      label: string;
      suggestedName: string;
    };

export type LibraryFilesIssue = {
  message: string;
  recovery?: LibraryFilesIssueRecovery;
  title: string;
};

export type LibraryFilesOperationResult = {
  didComplete: boolean;
  issue: LibraryFilesIssue | null;
};

const normalizeLibraryFilesNodeName = (value: string) => {
  return value.toLocaleLowerCase();
};

const resolveLibraryFilesEntityName = (
  entityCollections: UseLibraryFilesOptions,
  entityKind: RehearsalLibraryEntityKind,
  entityId: string,
) => {
  if (entityKind === 'track') {
    return entityCollections.savedSources.find(
      (source) => source.id === entityId,
    )?.name;
  }

  if (entityKind === 'loop') {
    return entityCollections.savedLoops.find((loop) => loop.id === entityId)
      ?.name;
  }

  return entityCollections.savedPlaylists.find(
    (playlist) => playlist.id === entityId,
  )?.name;
};

const resolveLibraryFilesFileLinkName = (options: {
  entityCollections: UseLibraryFilesOptions;
  fileLink: RehearsalLibraryFileLinkNode;
}) => {
  return (
    options.fileLink.visibleName ??
    resolveLibraryFilesEntityName(
      options.entityCollections,
      options.fileLink.entityKind,
      options.fileLink.entityId,
    ) ??
    options.fileLink.entityId
  );
};

const resolveLibraryFilesSiblingNames = (options: {
  entityCollections: UseLibraryFilesOptions;
  excludedFileLinkId?: string;
  excludedFolderId?: string;
  parentFolderId: string;
  tree: RehearsalLibraryFileTree;
}) => {
  const siblingFolderNames = options.tree.folders
    .filter((folder) => {
      return (
        folder.parentFolderId === options.parentFolderId &&
        folder.id !== options.excludedFolderId
      );
    })
    .map((folder) => folder.name);
  const siblingFileLinkNames = options.tree.fileLinks
    .filter((fileLink) => {
      return (
        fileLink.parentFolderId === options.parentFolderId &&
        fileLink.id !== options.excludedFileLinkId
      );
    })
    .map((fileLink) => {
      return resolveLibraryFilesFileLinkName({
        entityCollections: options.entityCollections,
        fileLink,
      });
    });

  return [...siblingFolderNames, ...siblingFileLinkNames];
};

const buildCopyCandidateName = (baseName: string, copyIndex: number) => {
  return copyIndex === 1 ? `${baseName} Copy` : `${baseName} Copy ${copyIndex}`;
};

const resolveCopyCandidateSeed = (sourceName: string) => {
  const matchedCopySuffix = COPY_NAME_SUFFIX_PATTERN.exec(sourceName);
  const baseName = matchedCopySuffix?.[1];
  const matchedSuffix = matchedCopySuffix?.[2];

  if (!matchedCopySuffix || !baseName || !matchedSuffix) {
    return {
      baseName: sourceName,
      nextCopyIndex: 1,
    };
  }

  return {
    baseName,
    nextCopyIndex: matchedCopySuffix[3] ? Number(matchedCopySuffix[3]) + 1 : 2,
  };
};

const extractDuplicateNameConflict = (error: unknown) => {
  const detail = error instanceof Error ? error.message.trim() : '';
  const matchedName = DUPLICATE_NAME_CONFLICT_PATTERN.exec(detail)?.[1]?.trim();

  return matchedName || null;
};

const isSiblingNameConflict = (
  siblingNames: readonly string[],
  targetName: string,
) => {
  const normalizedTargetName = normalizeLibraryFilesNodeName(targetName);

  return siblingNames.some((siblingName) => {
    return normalizeLibraryFilesNodeName(siblingName) === normalizedTargetName;
  });
};

export const resolveLibraryFilesSuggestedName = (options: {
  entityCollections: UseLibraryFilesOptions;
  excludedFileLinkId?: string;
  excludedFolderId?: string;
  parentFolderId: string;
  targetName: string;
  tree: RehearsalLibraryFileTree;
}) => {
  const siblingNames = resolveLibraryFilesSiblingNames(options);
  const { baseName, nextCopyIndex } = resolveCopyCandidateSeed(
    options.targetName,
  );

  for (let copyIndex = nextCopyIndex; ; copyIndex += 1) {
    const candidateName = buildCopyCandidateName(baseName, copyIndex);

    if (!isSiblingNameConflict(siblingNames, candidateName)) {
      return candidateName;
    }
  }
};

export const createLibraryFilesIssue = (options: {
  error: unknown;
  fallbackMessage: string;
  fallbackTitle: string;
  recovery?: (conflictingName: string) => LibraryFilesIssueRecovery | undefined;
}) => {
  const detail =
    options.error instanceof Error ? options.error.message.trim() : '';
  const conflictingName = extractDuplicateNameConflict(options.error);

  return {
    message: detail
      ? `${options.fallbackMessage} ${detail}`
      : options.fallbackMessage,
    recovery: conflictingName ? options.recovery?.(conflictingName) : undefined,
    title: options.fallbackTitle,
  } satisfies LibraryFilesIssue;
};

export const formatLibraryFilesIssue = (
  fallbackTitle: string,
  fallbackMessage: string,
  error: unknown,
): LibraryFilesIssue => {
  return createLibraryFilesIssue({
    error,
    fallbackMessage,
    fallbackTitle,
  });
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
