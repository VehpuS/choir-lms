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

export const writeStoredLibraryFileTree = async (
  ownerId: string,
  tree: RehearsalLibraryFileTree,
) => {
  await asyncStorage.setItem(
    libraryFileTreeStorageKey(ownerId),
    JSON.stringify(tree),
  );

  return tree;
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

export const persistSynchronizedLibraryFileTree = async (
  repository: CanonicalCollectionReader,
  ownerId: string,
  entityCollections?: RehearsalLibraryEntityCollections,
) => {
  const storedTree = await readStoredLibraryFileTree(ownerId);
  const nextEntityCollections =
    entityCollections ?? (await loadCanonicalCollections(repository, ownerId));
  const nextTree = syncRehearsalLibraryFileTree({
    existingTree: storedTree,
    entityCollections: nextEntityCollections,
  });

  if (JSON.stringify(storedTree) !== JSON.stringify(nextTree)) {
    await writeStoredLibraryFileTree(ownerId, nextTree);
  }

  return nextTree;
};
