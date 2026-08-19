import type {
  DriveAudioSource,
  NamedLoop,
  Playlist,
  RehearsalLibraryEntityKind,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

export type RehearsalLibraryEntityCollections = {
  loops: NamedLoop[];
  playlists: Playlist[];
  sources: DriveAudioSource[];
};

export const REHEARSAL_LIBRARY_FILE_TREE_VERSION = 1 as const;
export const REHEARSAL_LIBRARY_ROOT_FOLDER_ID = 'folder:library-root';

const REHEARSAL_LIBRARY_ROOT_FOLDER_NAME = 'Library';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isStringArray = (value: unknown): value is string[] => {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
};

const isRehearsalLibraryEntityKind = (
  value: unknown,
): value is RehearsalLibraryEntityKind => {
  return value === 'track' || value === 'loop' || value === 'playlist';
};

const isRehearsalLibraryFolderNode = (
  value: unknown,
): value is RehearsalLibraryFolderNode => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (typeof value.parentFolderId === 'string' ||
      value.parentFolderId === null) &&
    (value.tags === undefined || isStringArray(value.tags))
  );
};

const isRehearsalLibraryFileLinkNode = (
  value: unknown,
): value is RehearsalLibraryFileLinkNode => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.parentFolderId === 'string' &&
    isRehearsalLibraryEntityKind(value.entityKind) &&
    typeof value.entityId === 'string' &&
    (value.visibleName === undefined || typeof value.visibleName === 'string')
  );
};

const createEntityReferenceKey = (
  entityKind: RehearsalLibraryEntityKind,
  entityId: string,
) => {
  return `${entityKind}:${entityId}`;
};

const replaceOrAppendById = <Entity extends { id: string }>(
  values: Entity[],
  nextValue: Entity,
) => {
  const nextValues = [...values];
  const existingIndex = nextValues.findIndex(
    (value) => value.id === nextValue.id,
  );

  if (existingIndex === -1) {
    nextValues.push(nextValue);
    return nextValues;
  }

  nextValues[existingIndex] = nextValue;
  return nextValues;
};

export const createRehearsalLibraryRootFolderNode = (options?: {
  createdAt?: string;
}): RehearsalLibraryFolderNode => {
  return {
    id: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
    name: REHEARSAL_LIBRARY_ROOT_FOLDER_NAME,
    parentFolderId: null,
    createdAt: options?.createdAt ?? new Date().toISOString(),
  };
};

export const createRehearsalLibraryDefaultFileLinkNode = (
  entityKind: RehearsalLibraryEntityKind,
  entityId: string,
): RehearsalLibraryFileLinkNode => {
  return {
    id: `file-link:${entityKind}:${entityId}`,
    parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
    entityKind,
    entityId,
  };
};

export const parseStoredRehearsalLibraryFileTree = (
  value: string | null,
): RehearsalLibraryFileTree | null => {
  if (!value) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(value) as unknown;

    if (!isRecord(parsedValue)) {
      return null;
    }

    if (
      parsedValue.version !== REHEARSAL_LIBRARY_FILE_TREE_VERSION ||
      !Array.isArray(parsedValue.folders) ||
      !Array.isArray(parsedValue.fileLinks)
    ) {
      return null;
    }

    return {
      version: REHEARSAL_LIBRARY_FILE_TREE_VERSION,
      rootFolderId:
        typeof parsedValue.rootFolderId === 'string'
          ? parsedValue.rootFolderId
          : REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      folders: parsedValue.folders.filter(isRehearsalLibraryFolderNode),
      fileLinks: parsedValue.fileLinks.filter(isRehearsalLibraryFileLinkNode),
    };
  } catch {
    return null;
  }
};

const buildExpectedEntityReferences = (
  entityCollections: RehearsalLibraryEntityCollections,
) => {
  return [
    ...entityCollections.sources.map((source) => ({
      entityId: source.id,
      entityKind: 'track' as const,
    })),
    ...entityCollections.loops.map((loop) => ({
      entityId: loop.id,
      entityKind: 'loop' as const,
    })),
    ...entityCollections.playlists.map((playlist) => ({
      entityId: playlist.id,
      entityKind: 'playlist' as const,
    })),
  ];
};

export const syncRehearsalLibraryFileTree = (options: {
  entityCollections: RehearsalLibraryEntityCollections;
  existingTree?: RehearsalLibraryFileTree | null;
}): RehearsalLibraryFileTree => {
  const priorRootFolder = options.existingTree?.folders.find(
    (folder) => folder.id === REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
  );
  const rootFolder = createRehearsalLibraryRootFolderNode({
    createdAt: priorRootFolder?.createdAt,
  });
  const normalizedFolders = [rootFolder];
  const seenFolderIds = new Set<string>([rootFolder.id]);

  for (const folder of options.existingTree?.folders ?? []) {
    if (folder.id === rootFolder.id || seenFolderIds.has(folder.id)) {
      continue;
    }

    normalizedFolders.push({
      ...folder,
      parentFolderId:
        folder.parentFolderId && folder.parentFolderId !== folder.id
          ? folder.parentFolderId
          : rootFolder.id,
    });
    seenFolderIds.add(folder.id);
  }

  const validFolderIds = new Set(normalizedFolders.map((folder) => folder.id));
  const availableEntityReferences = new Set(
    buildExpectedEntityReferences(options.entityCollections).map(
      (reference) => {
        return createEntityReferenceKey(
          reference.entityKind,
          reference.entityId,
        );
      },
    ),
  );
  const normalizedFileLinks: RehearsalLibraryFileLinkNode[] = [];
  const seenFileLinkIds = new Set<string>();
  const linkedEntityReferences = new Set<string>();

  for (const fileLink of options.existingTree?.fileLinks ?? []) {
    if (seenFileLinkIds.has(fileLink.id)) {
      continue;
    }

    const entityReferenceKey = createEntityReferenceKey(
      fileLink.entityKind,
      fileLink.entityId,
    );

    if (!availableEntityReferences.has(entityReferenceKey)) {
      continue;
    }

    seenFileLinkIds.add(fileLink.id);
    linkedEntityReferences.add(entityReferenceKey);
    normalizedFileLinks.push({
      ...fileLink,
      parentFolderId: validFolderIds.has(fileLink.parentFolderId)
        ? fileLink.parentFolderId
        : rootFolder.id,
    });
  }

  for (const reference of buildExpectedEntityReferences(
    options.entityCollections,
  )) {
    const entityReferenceKey = createEntityReferenceKey(
      reference.entityKind,
      reference.entityId,
    );

    if (linkedEntityReferences.has(entityReferenceKey)) {
      continue;
    }

    normalizedFileLinks.push(
      createRehearsalLibraryDefaultFileLinkNode(
        reference.entityKind,
        reference.entityId,
      ),
    );
  }

  return {
    version: REHEARSAL_LIBRARY_FILE_TREE_VERSION,
    rootFolderId: rootFolder.id,
    folders: normalizedFolders,
    fileLinks: normalizedFileLinks,
  };
};

export const upsertRehearsalLibraryFolderNode = (
  tree: RehearsalLibraryFileTree,
  folder: RehearsalLibraryFolderNode,
): RehearsalLibraryFileTree => {
  return {
    ...tree,
    folders: replaceOrAppendById(tree.folders, folder),
  };
};

export const upsertRehearsalLibraryFileLinkNode = (
  tree: RehearsalLibraryFileTree,
  fileLink: RehearsalLibraryFileLinkNode,
): RehearsalLibraryFileTree => {
  return {
    ...tree,
    fileLinks: replaceOrAppendById(tree.fileLinks, fileLink),
  };
};

export const removeRehearsalLibraryFileLinkNode = (
  tree: RehearsalLibraryFileTree,
  fileLinkId: string,
): RehearsalLibraryFileTree => {
  return {
    ...tree,
    fileLinks: tree.fileLinks.filter((fileLink) => fileLink.id !== fileLinkId),
  };
};

export {
  assertValidRehearsalLibraryFileLinkMutation,
  assertValidRehearsalLibraryFolderMutation,
  resolveRehearsalLibraryCopyVisibleName,
} from './rehearsal-library-file-guards';
