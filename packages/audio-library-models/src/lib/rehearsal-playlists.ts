import {
  createPlaylistEntryFromLoop,
  createPlaylistEntryFromTrack,
  type DriveAudioSource,
  type NamedLoop,
  type OwnershipScope,
  type Playlist,
  type PlaylistEntry,
  type PlaylistEntryInput,
} from './rehearsal-domain.ts';

const defaultPlaylistId = (ownerId: string, createdAt: string) => {
  return `playlist:${ownerId}:${createdAt}`;
};

const moveItem = <Entity>(
  values: Entity[],
  fromIndex: number,
  toIndex: number,
) => {
  if (
    fromIndex < 0 ||
    fromIndex >= values.length ||
    toIndex < 0 ||
    toIndex >= values.length ||
    fromIndex === toIndex
  ) {
    return values;
  }

  const nextValues = [...values];
  const [movedValue] = nextValues.splice(fromIndex, 1);

  nextValues.splice(toIndex, 0, movedValue);

  return nextValues;
};

const getNormalizedSortIndex = (
  entry: PlaylistEntryInput,
  fallbackIndex: number,
) => {
  return Number.isFinite(entry.sortIndex) ? entry.sortIndex : fallbackIndex;
};

const normalizePlaylistItems = (
  playlistId: string,
  items: PlaylistEntryInput[],
): PlaylistEntry[] => {
  return [...items]
    .map((entry, originalIndex) => ({
      entry,
      originalIndex,
      sortIndex: getNormalizedSortIndex(entry, originalIndex),
    }))
    .sort((left, right) => {
      if (left.sortIndex !== right.sortIndex) {
        return left.sortIndex - right.sortIndex;
      }

      return left.originalIndex - right.originalIndex;
    })
    .map(({ entry }, sortIndex) => ({
      ...entry,
      playlistId,
      sortIndex,
    }));
};

const reindexPlaylistItems = (
  playlistId: string,
  items: PlaylistEntryInput[],
): PlaylistEntry[] => {
  return items.map((entry, sortIndex) => ({
    ...entry,
    playlistId,
    sortIndex,
  }));
};

export const normalizePlaylist = (
  playlist: Omit<Playlist, 'items'> & {
    items: PlaylistEntryInput[];
  },
): Playlist => {
  return {
    ...playlist,
    items: normalizePlaylistItems(playlist.id, playlist.items),
  };
};

const updatePlaylistItems = (
  playlist: Playlist,
  items: PlaylistEntryInput[],
  updatedAt: string,
): Playlist => {
  return {
    ...playlist,
    items: reindexPlaylistItems(playlist.id, items),
    updatedAt,
  };
};

export const createPlaylist = (options: {
  createId?: (ownerId: string, createdAt: string) => string;
  createdAt?: string;
  items?: PlaylistEntryInput[];
  name: string;
  ownerId: string;
  ownershipScope?: OwnershipScope;
}): Playlist => {
  const createdAt = options.createdAt ?? new Date().toISOString();

  return normalizePlaylist({
    id:
      options.createId?.(options.ownerId, createdAt) ??
      defaultPlaylistId(options.ownerId, createdAt),
    name: options.name.trim(),
    items: options.items ?? [],
    ownershipScope: options.ownershipScope ?? 'user',
    ownerId: options.ownerId,
    createdAt,
    updatedAt: createdAt,
  });
};

export const renamePlaylist = (
  playlist: Playlist,
  name: string,
  updatedAt: string = new Date().toISOString(),
): Playlist => {
  return normalizePlaylist({
    ...playlist,
    name: name.trim(),
    updatedAt,
  });
};

export const addTrackToPlaylist = (
  playlist: Playlist,
  source: DriveAudioSource,
  updatedAt: string = new Date().toISOString(),
): Playlist => {
  return updatePlaylistItems(
    playlist,
    [
      ...playlist.items,
      createPlaylistEntryFromTrack(source, updatedAt, {
        playlistId: playlist.id,
        sortIndex: playlist.items.length,
      }),
    ],
    updatedAt,
  );
};

export const addLoopToPlaylist = (
  playlist: Playlist,
  loop: NamedLoop,
  updatedAt: string = new Date().toISOString(),
): Playlist => {
  return updatePlaylistItems(
    playlist,
    [
      ...playlist.items,
      createPlaylistEntryFromLoop(loop, updatedAt, {
        playlistId: playlist.id,
        sortIndex: playlist.items.length,
      }),
    ],
    updatedAt,
  );
};

export const removePlaylistEntry = (
  playlist: Playlist,
  entryId: string,
  updatedAt: string = new Date().toISOString(),
): Playlist => {
  return updatePlaylistItems(
    playlist,
    playlist.items.filter((entry) => entry.id !== entryId),
    updatedAt,
  );
};

export const movePlaylistEntry = (
  playlist: Playlist,
  fromIndex: number,
  toIndex: number,
  updatedAt: string = new Date().toISOString(),
): Playlist => {
  return updatePlaylistItems(
    playlist,
    moveItem(playlist.items, fromIndex, toIndex),
    updatedAt,
  );
};
