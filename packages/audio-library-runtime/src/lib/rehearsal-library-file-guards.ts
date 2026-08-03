import type {
  RehearsalLibraryEntityKind,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import type { RehearsalLibraryEntityCollections } from './rehearsal-library-files';

const COPY_NAME_SUFFIX_PATTERN = /^(.*?)( Copy(?: (\d+))?)?$/i;

const normalizeRehearsalLibraryNodeName = (value: string) => {
  return value.toLocaleLowerCase();
};

const resolveRehearsalLibraryEntityName = (
  entityCollections: RehearsalLibraryEntityCollections,
  entityKind: RehearsalLibraryEntityKind,
  entityId: string,
) => {
  if (entityKind === 'track') {
    return entityCollections.sources.find((source) => source.id === entityId)
      ?.name;
  }

  if (entityKind === 'loop') {
    return entityCollections.loops.find((loop) => loop.id === entityId)?.name;
  }

  return entityCollections.playlists.find(
    (playlist) => playlist.id === entityId,
  )?.name;
};

const resolveRehearsalLibraryFileLinkName = (options: {
  entityCollections: RehearsalLibraryEntityCollections;
  fileLink: RehearsalLibraryFileLinkNode;
}) => {
  return (
    options.fileLink.visibleName ??
    resolveRehearsalLibraryEntityName(
      options.entityCollections,
      options.fileLink.entityKind,
      options.fileLink.entityId,
    ) ??
    options.fileLink.entityId
  );
};

const resolveSiblingNodeNames = (options: {
  tree: RehearsalLibraryFileTree;
  entityCollections: RehearsalLibraryEntityCollections;
  parentFolderId: string;
  excludedFileLinkId?: string;
  excludedFolderId?: string;
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
      return resolveRehearsalLibraryFileLinkName({
        entityCollections: options.entityCollections,
        fileLink,
      });
    });

  return [...siblingFolderNames, ...siblingFileLinkNames];
};

const hasSiblingNodeNameConflict = (options: {
  tree: RehearsalLibraryFileTree;
  entityCollections: RehearsalLibraryEntityCollections;
  parentFolderId: string;
  targetName: string;
  excludedFileLinkId?: string;
  excludedFolderId?: string;
}) => {
  const normalizedTargetName = normalizeRehearsalLibraryNodeName(
    options.targetName,
  );

  return resolveSiblingNodeNames(options).some((existingName) => {
    return (
      normalizeRehearsalLibraryNodeName(existingName) === normalizedTargetName
    );
  });
};

const collectDescendantFolderIds = (
  tree: RehearsalLibraryFileTree,
  folderId: string,
) => {
  const descendantIds = new Set<string>();
  const pendingFolderIds = [folderId];

  while (pendingFolderIds.length > 0) {
    const currentFolderId = pendingFolderIds.pop();

    if (!currentFolderId) {
      continue;
    }

    for (const folder of tree.folders) {
      if (
        folder.parentFolderId !== currentFolderId ||
        descendantIds.has(folder.id)
      ) {
        continue;
      }

      descendantIds.add(folder.id);
      pendingFolderIds.push(folder.id);
    }
  }

  return descendantIds;
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

export const resolveRehearsalLibraryCopyVisibleName = (options: {
  tree: RehearsalLibraryFileTree;
  entityCollections: RehearsalLibraryEntityCollections;
  parentFolderId: string;
  sourceName: string;
}) => {
  const { baseName, nextCopyIndex } = resolveCopyCandidateSeed(
    options.sourceName,
  );

  for (let copyIndex = nextCopyIndex; ; copyIndex += 1) {
    const candidateName = buildCopyCandidateName(baseName, copyIndex);

    if (
      !hasSiblingNodeNameConflict({
        tree: options.tree,
        entityCollections: options.entityCollections,
        parentFolderId: options.parentFolderId,
        targetName: candidateName,
      })
    ) {
      return candidateName;
    }
  }
};

export const assertValidRehearsalLibraryFolderMutation = (options: {
  tree: RehearsalLibraryFileTree;
  entityCollections: RehearsalLibraryEntityCollections;
  folder: RehearsalLibraryFolderNode;
}) => {
  if (options.folder.parentFolderId === null) {
    return;
  }

  const descendantFolderIds = collectDescendantFolderIds(
    options.tree,
    options.folder.id,
  );

  if (
    options.folder.parentFolderId === options.folder.id ||
    descendantFolderIds.has(options.folder.parentFolderId)
  ) {
    throw new Error(
      `Folder "${options.folder.name}" cannot be moved into itself or one of its descendants.`,
    );
  }

  if (
    hasSiblingNodeNameConflict({
      tree: options.tree,
      entityCollections: options.entityCollections,
      parentFolderId: options.folder.parentFolderId,
      targetName: options.folder.name,
      excludedFolderId: options.folder.id,
    })
  ) {
    throw new Error(
      `An item named "${options.folder.name}" already exists in the target folder.`,
    );
  }
};

export const assertValidRehearsalLibraryFileLinkMutation = (options: {
  tree: RehearsalLibraryFileTree;
  entityCollections: RehearsalLibraryEntityCollections;
  fileLink: RehearsalLibraryFileLinkNode;
}) => {
  const targetName = resolveRehearsalLibraryFileLinkName({
    entityCollections: options.entityCollections,
    fileLink: options.fileLink,
  });

  if (
    hasSiblingNodeNameConflict({
      tree: options.tree,
      entityCollections: options.entityCollections,
      parentFolderId: options.fileLink.parentFolderId,
      targetName,
      excludedFileLinkId: options.fileLink.id,
    })
  ) {
    throw new Error(
      `An item named "${targetName}" already exists in the target folder.`,
    );
  }
};
