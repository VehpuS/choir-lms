import type {
  DriveAudioSource,
  NamedLoop,
  Playlist,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';

import {
  parseStoredRehearsalLibraryFileTree,
  syncRehearsalLibraryFileTree,
  type RehearsalLibraryEntityCollections,
} from './rehearsal-library-files';

type StoredCollectionKind = 'sources' | 'loops' | 'playlists';

type CanonicalCollectionReader = {
  listLoops(ownerId: string): Promise<NamedLoop[]>;
  listPlaylists(ownerId: string): Promise<Playlist[]>;
  listSources(ownerId: string): Promise<DriveAudioSource[]>;
};

const asyncStorage = AsyncStorage as unknown as AsyncStorageStatic;

const libraryFileTreeQueueByOwnerId = new Map<string, Promise<unknown>>();

/**
 * Serializes read-modify-write access to one owner's library file tree.
 * Without this, a `refresh()`-style read racing against an explicit
 * mutation (e.g. moving a file link) can read a stale snapshot and later
 * overwrite the mutation's result, silently reverting it in memory even
 * though the mutation's own write already landed in storage.
 */
const runSerializedLibraryFileTreeOperation = <Result>(
  ownerId: string,
  operation: () => Promise<Result>,
): Promise<Result> => {
  const previousTurn =
    libraryFileTreeQueueByOwnerId.get(ownerId) ?? Promise.resolve();
  const thisTurn = previousTurn.then(operation, operation);

  libraryFileTreeQueueByOwnerId.set(
    ownerId,
    thisTurn.then(
      () => undefined,
      () => undefined,
    ),
  );

  return thisTurn;
};

const storageKey = (entity: StoredCollectionKind, ownerId: string) => {
  return `choirlms:practice:${entity}:${ownerId}`;
};

const libraryFileTreeStorageKey = (ownerId: string) => {
  return `choirlms:practice:library-tree:${ownerId}`;
};

const readStoredLibraryFileTree = async (ownerId: string) => {
  const value = await asyncStorage.getItem(libraryFileTreeStorageKey(ownerId));

  return parseStoredRehearsalLibraryFileTree(value);
};

export const readStoredCollection = async <Entity>(
  entity: StoredCollectionKind,
  ownerId: string,
): Promise<Entity[]> => {
  const value = await asyncStorage.getItem(storageKey(entity, ownerId));

  if (!value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value) as Entity[];

    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    await asyncStorage.removeItem(storageKey(entity, ownerId));
    return [];
  }
};

export const writeStoredCollection = async <Entity>(
  entity: StoredCollectionKind,
  ownerId: string,
  values: Entity[],
) => {
  await asyncStorage.setItem(
    storageKey(entity, ownerId),
    JSON.stringify(values),
  );
  return values;
};

const writeStoredLibraryFileTreeRaw = async (
  ownerId: string,
  tree: RehearsalLibraryFileTree,
) => {
  await asyncStorage.setItem(
    libraryFileTreeStorageKey(ownerId),
    JSON.stringify(tree),
  );

  return tree;
};

export const writeStoredLibraryFileTree = (
  ownerId: string,
  tree: RehearsalLibraryFileTree,
) => {
  return runSerializedLibraryFileTreeOperation(ownerId, () => {
    return writeStoredLibraryFileTreeRaw(ownerId, tree);
  });
};

export const loadCanonicalCollections = async (
  repository: CanonicalCollectionReader,
  ownerId: string,
): Promise<RehearsalLibraryEntityCollections> => {
  return {
    loops: await repository.listLoops(ownerId),
    playlists: await repository.listPlaylists(ownerId),
    sources: await repository.listSources(ownerId),
  };
};

export const hasCanonicalEntity = (
  entityCollections: RehearsalLibraryEntityCollections,
  fileLink: RehearsalLibraryFileLinkNode,
) => {
  if (fileLink.entityKind === 'track') {
    return entityCollections.sources.some(
      (source) => source.id === fileLink.entityId,
    );
  }

  if (fileLink.entityKind === 'loop') {
    return entityCollections.loops.some(
      (loop) => loop.id === fileLink.entityId,
    );
  }

  return entityCollections.playlists.some(
    (playlist) => playlist.id === fileLink.entityId,
  );
};

export const persistSynchronizedLibraryFileTree = (
  repository: CanonicalCollectionReader,
  ownerId: string,
  entityCollections?: RehearsalLibraryEntityCollections,
) => {
  return runSerializedLibraryFileTreeOperation(ownerId, async () => {
    const storedTree = await readStoredLibraryFileTree(ownerId);
    const nextEntityCollections =
      entityCollections ??
      (await loadCanonicalCollections(repository, ownerId));
    const nextTree = syncRehearsalLibraryFileTree({
      existingTree: storedTree,
      entityCollections: nextEntityCollections,
    });

    if (JSON.stringify(storedTree) !== JSON.stringify(nextTree)) {
      await writeStoredLibraryFileTreeRaw(ownerId, nextTree);
    }

    return nextTree;
  });
};
