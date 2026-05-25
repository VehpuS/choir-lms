import {
  createLoopPlayableItem,
  createTrackPlayableItem,
  isSourcePlayable,
  type DriveAudioSource,
  type NamedLoop,
  type PlayableItem,
  type Playlist,
  type RehearsalQueueMode,
  type RepeatMode,
} from '@org/audio-library-models';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';
import { filter, flatMap, keyBy, size, sortBy } from 'es-toolkit/compat';

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

    return writeCollection(storageKey('sources', ownerId), nextSources);
  }

  async deleteSource(ownerId: string, sourceId: string) {
    const sources = await this.listSources(ownerId);
    const loops = await this.listLoops(ownerId);
    const nextSources = filter(sources, (source) => source.id !== sourceId);
    const nextLoops = filter(loops, (loop) => loop.sourceId !== sourceId);

    await writeCollection(storageKey('loops', ownerId), nextLoops);

    return writeCollection(storageKey('sources', ownerId), nextSources);
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

    return writeCollection(storageKey('loops', loop.ownerId), nextLoops);
  }

  async deleteLoop(ownerId: string, loopId: string) {
    const loops = await this.listLoops(ownerId);
    const nextLoops = filter(loops, (loop) => loop.id !== loopId);

    return writeCollection(storageKey('loops', ownerId), nextLoops);
  }

  async listPlaylists(ownerId: string) {
    return readCollection<Playlist>(storageKey('playlists', ownerId));
  }

  async savePlaylist(playlist: Playlist) {
    const playlists = await this.listPlaylists(playlist.ownerId);
    const otherPlaylists = filter(
      playlists,
      (existingPlaylist) => existingPlaylist.id !== playlist.id,
    );
    const nextPlaylists = sortBy([...otherPlaylists, playlist], ['name']);

    return writeCollection(
      storageKey('playlists', playlist.ownerId),
      nextPlaylists,
    );
  }

  async deletePlaylist(ownerId: string, playlistId: string) {
    const playlists = await this.listPlaylists(ownerId);
    const nextPlaylists = filter(
      playlists,
      (playlist) => playlist.id !== playlistId,
    );

    return writeCollection(storageKey('playlists', ownerId), nextPlaylists);
  }
}

export const resolvePlaylistItems = (
  playlist: Playlist,
  loops: NamedLoop[],
  sources: DriveAudioSource[],
) => {
  const loopsById: Partial<Record<string, NamedLoop>> = keyBy(
    loops,
    (loop) => loop.id,
  );
  const sourcesById: Partial<Record<string, DriveAudioSource>> = keyBy(
    sources,
    (source) => source.id,
  );

  const playableItems = flatMap(playlist.items, (entry) => {
    const source = sourcesById[entry.sourceId];

    if (!source || !isSourcePlayable(source)) {
      return [];
    }

    if (entry.kind === 'track') {
      return [createTrackPlayableItem(source, playlist.id)];
    }

    if (!entry.loopId) {
      return [];
    }

    const loop = loopsById[entry.loopId];

    if (!loop) {
      return [];
    }

    return [createLoopPlayableItem(loop, source, playlist.id)];
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
