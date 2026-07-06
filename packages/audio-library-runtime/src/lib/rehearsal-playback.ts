import {
  createLoopPlayableItem,
  createTrackPlayableItem,
  isSourcePlayable,
  normalizePlaylist,
  type DriveAudioSource,
  type NamedLoop,
  type PlayableItem,
  type Playlist,
  type RehearsalLibraryFileLinkNode,
  type RehearsalLibraryFileTree,
  type RehearsalLibraryFolderNode,
  type RehearsalQueueMode,
  type RepeatMode,
} from '@org/audio-library-models';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';
import { filter, flatMap, keyBy, size, sortBy } from 'es-toolkit/compat';

import {
  parseStoredRehearsalLibraryFileTree,
  REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
  removeRehearsalLibraryFileLinkNode,
  syncRehearsalLibraryFileTree,
  upsertRehearsalLibraryFileLinkNode,
  upsertRehearsalLibraryFolderNode,
  type RehearsalLibraryEntityCollections,
} from './rehearsal-library-files';

export type PracticeRepository = {
  listSources(ownerId: string): Promise<DriveAudioSource[]>;
  saveSource(
    ownerId: string,
    source: DriveAudioSource,
  ): Promise<DriveAudioSource[]>;
  deleteSource(ownerId: string, sourceId: string): Promise<DriveAudioSource[]>;
  listLoops(ownerId: string): Promise<NamedLoop[]>;
  saveLoop(loop: NamedLoop): Promise<NamedLoop[]>;
  deleteLoop(ownerId: string, loopId: string): Promise<NamedLoop[]>;
  listPlaylists(ownerId: string): Promise<Playlist[]>;
  savePlaylist(playlist: Playlist): Promise<Playlist[]>;
  deletePlaylist(ownerId: string, playlistId: string): Promise<Playlist[]>;
  listLibraryFileTree(ownerId: string): Promise<RehearsalLibraryFileTree>;
  saveLibraryFolderNode(
    ownerId: string,
    folder: RehearsalLibraryFolderNode,
  ): Promise<RehearsalLibraryFileTree>;
  saveLibraryFileLink(
    ownerId: string,
    fileLink: RehearsalLibraryFileLinkNode,
  ): Promise<RehearsalLibraryFileTree>;
  deleteLibraryFileLink(
    ownerId: string,
    fileLinkId: string,
  ): Promise<RehearsalLibraryFileTree>;
};

export type PlaybackQueue = {
  playlistId: string;
  mode: RehearsalQueueMode;
  repeatMode: RepeatMode;
  items: PlayableItem[];
};

const asyncStorage = AsyncStorage as unknown as AsyncStorageStatic;

const storageKey = (
  entity: 'sources' | 'loops' | 'playlists',
  ownerId: string,
) => {
  return `choirlms:practice:${entity}:${ownerId}`;
};

const libraryFileTreeStorageKey = (ownerId: string) => {
  return `choirlms:practice:library-tree:${ownerId}`;
};

const readCollection = async <Entity>(key: string): Promise<Entity[]> => {
  const value = await asyncStorage.getItem(key);

  if (!value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value) as Entity[];

    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    await asyncStorage.removeItem(key);
    return [];
  }
};

const writeCollection = async <Entity>(key: string, values: Entity[]) => {
  await asyncStorage.setItem(key, JSON.stringify(values));
  return values;
};

const readLibraryFileTree = async (ownerId: string) => {
  const value = await asyncStorage.getItem(libraryFileTreeStorageKey(ownerId));

  return parseStoredRehearsalLibraryFileTree(value);
};

const writeLibraryFileTree = async (
  ownerId: string,
  tree: RehearsalLibraryFileTree,
) => {
  await asyncStorage.setItem(
    libraryFileTreeStorageKey(ownerId),
    JSON.stringify(tree),
  );

  return tree;
};

const loadCanonicalCollections = async (
  repository: Pick<
    PracticeRepository,
    'listLoops' | 'listPlaylists' | 'listSources'
  >,
  ownerId: string,
): Promise<RehearsalLibraryEntityCollections> => {
  return {
    loops: await repository.listLoops(ownerId),
    playlists: await repository.listPlaylists(ownerId),
    sources: await repository.listSources(ownerId),
  };
};

const hasCanonicalEntity = (
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

const persistSynchronizedLibraryFileTree = async (
  repository: Pick<
    PracticeRepository,
    'listLoops' | 'listPlaylists' | 'listSources'
  >,
  ownerId: string,
  entityCollections?: RehearsalLibraryEntityCollections,
) => {
  const storedTree = await readLibraryFileTree(ownerId);
  const nextEntityCollections =
    entityCollections ?? (await loadCanonicalCollections(repository, ownerId));
  const nextTree = syncRehearsalLibraryFileTree({
    existingTree: storedTree,
    entityCollections: nextEntityCollections,
  });

  if (JSON.stringify(storedTree) !== JSON.stringify(nextTree)) {
    await writeLibraryFileTree(ownerId, nextTree);
  }

  return nextTree;
};

const shuffleItems = <Entity>(
  values: Entity[],
  random: () => number = Math.random,
) => {
  const items = [...values];
  const itemCount = size(items);

  for (let index = itemCount - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(random() * (index + 1));
    const currentValue = items[index];

    items[index] = items[targetIndex];
    items[targetIndex] = currentValue;
  }

  return items;
};

export class AsyncStoragePracticeRepository implements PracticeRepository {
  async listSources(ownerId: string) {
    return readCollection<DriveAudioSource>(storageKey('sources', ownerId));
  }

  async saveSource(ownerId: string, source: DriveAudioSource) {
    const sources = await this.listSources(ownerId);
    const otherSources = filter(
      sources,
      (existingSource) => existingSource.id !== source.id,
    );
    const nextSources = sortBy([...otherSources, source], ['name']);

    await writeCollection(storageKey('sources', ownerId), nextSources);
    await persistSynchronizedLibraryFileTree(this, ownerId, {
      loops: await this.listLoops(ownerId),
      playlists: await this.listPlaylists(ownerId),
      sources: nextSources,
    });

    return nextSources;
  }

  async deleteSource(ownerId: string, sourceId: string) {
    const sources = await this.listSources(ownerId);
    const loops = await this.listLoops(ownerId);
    const nextSources = filter(sources, (source) => source.id !== sourceId);
    const nextLoops = filter(loops, (loop) => loop.sourceId !== sourceId);

    await writeCollection(storageKey('loops', ownerId), nextLoops);
    await writeCollection(storageKey('sources', ownerId), nextSources);
    await persistSynchronizedLibraryFileTree(this, ownerId, {
      loops: nextLoops,
      playlists: await this.listPlaylists(ownerId),
      sources: nextSources,
    });

    return nextSources;
  }

  async listLoops(ownerId: string) {
    return readCollection<NamedLoop>(storageKey('loops', ownerId));
  }

  async saveLoop(loop: NamedLoop) {
    const loops = await this.listLoops(loop.ownerId);
    const otherLoops = filter(
      loops,
      (existingLoop) => existingLoop.id !== loop.id,
    );
    const nextLoops = sortBy([...otherLoops, loop], ['name']);

    await writeCollection(storageKey('loops', loop.ownerId), nextLoops);
    await persistSynchronizedLibraryFileTree(this, loop.ownerId, {
      loops: nextLoops,
      playlists: await this.listPlaylists(loop.ownerId),
      sources: await this.listSources(loop.ownerId),
    });

    return nextLoops;
  }

  async deleteLoop(ownerId: string, loopId: string) {
    const loops = await this.listLoops(ownerId);
    const nextLoops = filter(loops, (loop) => loop.id !== loopId);

    await writeCollection(storageKey('loops', ownerId), nextLoops);
    await persistSynchronizedLibraryFileTree(this, ownerId, {
      loops: nextLoops,
      playlists: await this.listPlaylists(ownerId),
      sources: await this.listSources(ownerId),
    });

    return nextLoops;
  }

  async listPlaylists(ownerId: string) {
    const key = storageKey('playlists', ownerId);
    const playlists = await readCollection<Playlist>(key);
    const normalizedPlaylists = playlists.map((playlist) => {
      return normalizePlaylist(playlist);
    });

    if (JSON.stringify(playlists) !== JSON.stringify(normalizedPlaylists)) {
      await writeCollection(key, normalizedPlaylists);
    }

    return normalizedPlaylists;
  }

  async savePlaylist(playlist: Playlist) {
    const normalizedPlaylist = normalizePlaylist(playlist);
    const playlists = await this.listPlaylists(playlist.ownerId);
    const otherPlaylists = filter(
      playlists,
      (existingPlaylist) => existingPlaylist.id !== normalizedPlaylist.id,
    );
    const nextPlaylists = sortBy(
      [...otherPlaylists, normalizedPlaylist],
      ['name'],
    );

    await writeCollection(
      storageKey('playlists', normalizedPlaylist.ownerId),
      nextPlaylists,
    );
    await persistSynchronizedLibraryFileTree(this, normalizedPlaylist.ownerId, {
      loops: await this.listLoops(normalizedPlaylist.ownerId),
      playlists: nextPlaylists,
      sources: await this.listSources(normalizedPlaylist.ownerId),
    });

    return nextPlaylists;
  }

  async deletePlaylist(ownerId: string, playlistId: string) {
    const playlists = await this.listPlaylists(ownerId);
    const nextPlaylists = filter(
      playlists,
      (playlist) => playlist.id !== playlistId,
    );

    await writeCollection(storageKey('playlists', ownerId), nextPlaylists);
    await persistSynchronizedLibraryFileTree(this, ownerId, {
      loops: await this.listLoops(ownerId),
      playlists: nextPlaylists,
      sources: await this.listSources(ownerId),
    });

    return nextPlaylists;
  }

  async listLibraryFileTree(ownerId: string) {
    return persistSynchronizedLibraryFileTree(this, ownerId);
  }

  async saveLibraryFolderNode(
    ownerId: string,
    folder: RehearsalLibraryFolderNode,
  ) {
    if (folder.id === REHEARSAL_LIBRARY_ROOT_FOLDER_ID) {
      throw new Error('The root library folder cannot be mutated.');
    }

    if (folder.parentFolderId === null) {
      throw new Error(
        'Non-root library folders must reference a parent folder.',
      );
    }

    const tree = await this.listLibraryFileTree(ownerId);

    if (
      !tree.folders.some(
        (existingFolder) => existingFolder.id === folder.parentFolderId,
      )
    ) {
      throw new Error(
        `The parent folder "${folder.parentFolderId}" does not exist.`,
      );
    }

    return writeLibraryFileTree(
      ownerId,
      upsertRehearsalLibraryFolderNode(tree, folder),
    );
  }

  async saveLibraryFileLink(
    ownerId: string,
    fileLink: RehearsalLibraryFileLinkNode,
  ) {
    const entityCollections = await loadCanonicalCollections(this, ownerId);
    const tree = await persistSynchronizedLibraryFileTree(
      this,
      ownerId,
      entityCollections,
    );

    if (!tree.folders.some((folder) => folder.id === fileLink.parentFolderId)) {
      throw new Error(
        `The parent folder "${fileLink.parentFolderId}" does not exist.`,
      );
    }

    if (!hasCanonicalEntity(entityCollections, fileLink)) {
      throw new Error(
        `The ${fileLink.entityKind} entity "${fileLink.entityId}" is not available in the saved library.`,
      );
    }

    return writeLibraryFileTree(
      ownerId,
      syncRehearsalLibraryFileTree({
        existingTree: upsertRehearsalLibraryFileLinkNode(tree, fileLink),
        entityCollections,
      }),
    );
  }

  async deleteLibraryFileLink(ownerId: string, fileLinkId: string) {
    const tree = await this.listLibraryFileTree(ownerId);
    const fileLink = tree.fileLinks.find(
      (existingFileLink) => existingFileLink.id === fileLinkId,
    );

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
      return writeLibraryFileTree(
        ownerId,
        removeRehearsalLibraryFileLinkNode(tree, fileLinkId),
      );
    }

    if (fileLink.entityKind === 'track') {
      await this.deleteSource(ownerId, fileLink.entityId);
    } else if (fileLink.entityKind === 'loop') {
      await this.deleteLoop(ownerId, fileLink.entityId);
    } else {
      await this.deletePlaylist(ownerId, fileLink.entityId);
    }

    return this.listLibraryFileTree(ownerId);
  }
}

export const resolvePlaylistItems = (
  playlist: Playlist,
  loops: NamedLoop[],
  sources: DriveAudioSource[],
) => {
  const normalizedPlaylist = normalizePlaylist(playlist);
  const loopsById: Partial<Record<string, NamedLoop>> = keyBy(
    loops,
    (loop) => loop.id,
  );
  const sourcesById: Partial<Record<string, DriveAudioSource>> = keyBy(
    sources,
    (source) => source.id,
  );

  const playableItems = flatMap(normalizedPlaylist.items, (entry) => {
    const source = sourcesById[entry.sourceId];

    if (!source || !isSourcePlayable(source)) {
      return [];
    }

    if (entry.kind === 'track') {
      return [createTrackPlayableItem(source, normalizedPlaylist.id, entry.id)];
    }

    if (!entry.loopId) {
      return [];
    }

    const loop = loopsById[entry.loopId];

    if (!loop) {
      return [];
    }

    return [
      createLoopPlayableItem(loop, source, normalizedPlaylist.id, entry.id),
    ];
  });

  return playableItems;
};

export const createPlaybackQueue = (
  playlist: Playlist,
  loops: NamedLoop[],
  sources: DriveAudioSource[],
  options?: {
    mode?: RehearsalQueueMode;
    repeatMode?: RepeatMode;
    random?: () => number;
  },
): PlaybackQueue => {
  const items = resolvePlaylistItems(playlist, loops, sources);
  const mode = options?.mode ?? 'ordered';
  const repeatMode = options?.repeatMode ?? 'off';

  return {
    playlistId: playlist.id,
    mode,
    repeatMode,
    items: mode === 'shuffle' ? shuffleItems(items, options?.random) : items,
  };
};

export const resolveNextQueueIndex = (
  currentIndex: number,
  itemCount: number,
  repeatMode: RepeatMode,
) => {
  if (itemCount === 0) {
    return null;
  }

  if (repeatMode === 'one') {
    return currentIndex;
  }

  if (currentIndex < itemCount - 1) {
    return currentIndex + 1;
  }

  if (repeatMode === 'all') {
    return 0;
  }

  return null;
};

export const resolvePreviousQueueIndex = (
  currentIndex: number,
  itemCount: number,
  repeatMode: RepeatMode,
) => {
  if (itemCount === 0) {
    return null;
  }

  if (currentIndex > 0) {
    return currentIndex - 1;
  }

  if (repeatMode === 'all') {
    return itemCount - 1;
  }

  return 0;
};
