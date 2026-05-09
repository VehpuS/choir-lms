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
} from '@org/rehearsal-domain';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PracticeRepository = {
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

const storageKey = (entity: 'loops' | 'playlists', ownerId: string) => {
  return `choirlms:practice:${entity}:${ownerId}`;
};

const readCollection = async <Entity>(key: string): Promise<Entity[]> => {
  const value = await AsyncStorage.getItem(key);

  if (!value) {
    return [];
  }

  const parsedValue = JSON.parse(value) as Entity[];

  return Array.isArray(parsedValue) ? parsedValue : [];
};

const writeCollection = async <Entity>(key: string, values: Entity[]) => {
  await AsyncStorage.setItem(key, JSON.stringify(values));
  return values;
};

const shuffleItems = <Entity>(
  values: Entity[],
  random: () => number = Math.random,
) => {
  const items = [...values];

  for (let index = items.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(random() * (index + 1));
    const currentValue = items[index];

    items[index] = items[targetIndex];
    items[targetIndex] = currentValue;
  }

  return items;
};

export class AsyncStoragePracticeRepository implements PracticeRepository {
  async listLoops(ownerId: string) {
    return readCollection<NamedLoop>(storageKey('loops', ownerId));
  }

  async saveLoop(loop: NamedLoop) {
    const loops = await this.listLoops(loop.ownerId);
    const nextLoops = [
      ...loops.filter((existingLoop) => existingLoop.id !== loop.id),
      loop,
    ].sort((leftLoop, rightLoop) => {
      return leftLoop.name.localeCompare(rightLoop.name);
    });

    return writeCollection(storageKey('loops', loop.ownerId), nextLoops);
  }

  async deleteLoop(ownerId: string, loopId: string) {
    const loops = await this.listLoops(ownerId);
    const nextLoops = loops.filter((loop) => loop.id !== loopId);

    return writeCollection(storageKey('loops', ownerId), nextLoops);
  }

  async listPlaylists(ownerId: string) {
    return readCollection<Playlist>(storageKey('playlists', ownerId));
  }

  async savePlaylist(playlist: Playlist) {
    const playlists = await this.listPlaylists(playlist.ownerId);
    const nextPlaylists = [
      ...playlists.filter(
        (existingPlaylist) => existingPlaylist.id !== playlist.id,
      ),
      playlist,
    ].sort((leftPlaylist, rightPlaylist) => {
      return leftPlaylist.name.localeCompare(rightPlaylist.name);
    });

    return writeCollection(
      storageKey('playlists', playlist.ownerId),
      nextPlaylists,
    );
  }

  async deletePlaylist(ownerId: string, playlistId: string) {
    const playlists = await this.listPlaylists(ownerId);
    const nextPlaylists = playlists.filter(
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
  const loopsById = new Map(loops.map((loop) => [loop.id, loop]));
  const sourcesById = new Map(sources.map((source) => [source.id, source]));

  const playableItems = playlist.items.flatMap((entry) => {
    const source = sourcesById.get(entry.sourceId);

    if (!source || !isSourcePlayable(source)) {
      return [];
    }

    if (entry.kind === 'track') {
      return [createTrackPlayableItem(source, playlist.id)];
    }

    if (!entry.loopId) {
      return [];
    }

    const loop = loopsById.get(entry.loopId);

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
