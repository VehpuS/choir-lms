import {
  createPlaylistEntryFromLoop,
  createPlaylistEntryFromTrack,
  type DriveAudioSource,
  type NamedLoop,
  type OwnershipScope,
  type Playlist,
  type PlaylistEntry,
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

export const createPlaylist = (options: {
  createId?: (ownerId: string, createdAt: string) => string;
  createdAt?: string;
  items?: PlaylistEntry[];
  name: string;
  ownerId: string;
  ownershipScope?: OwnershipScope;
}): Playlist => {
  const createdAt = options.createdAt ?? new Date().toISOString();

  return {
    id:
      options.createId?.(options.ownerId, createdAt) ??
      defaultPlaylistId(options.ownerId, createdAt),
    name: options.name.trim(),
    items: options.items ?? [],
    ownershipScope: options.ownershipScope ?? 'user',
    ownerId: options.ownerId,
    createdAt,
    updatedAt: createdAt,
  };
};

export const renamePlaylist = (
  playlist: Playlist,
  name: string,
  updatedAt: string = new Date().toISOString(),
): Playlist => {
  return {
    ...playlist,
    name: name.trim(),
    updatedAt,
  };
};

export const addTrackToPlaylist = (
  playlist: Playlist,
  source: DriveAudioSource,
  updatedAt: string = new Date().toISOString(),
): Playlist => {
  return {
    ...playlist,
    items: [...playlist.items, createPlaylistEntryFromTrack(source, updatedAt)],
    updatedAt,
  };
};

export const addLoopToPlaylist = (
  playlist: Playlist,
  loop: NamedLoop,
  updatedAt: string = new Date().toISOString(),
): Playlist => {
  return {
    ...playlist,
    items: [...playlist.items, createPlaylistEntryFromLoop(loop, updatedAt)],
    updatedAt,
  };
};

export const removePlaylistEntry = (
  playlist: Playlist,
  entryId: string,
  updatedAt: string = new Date().toISOString(),
): Playlist => {
  return {
    ...playlist,
    items: playlist.items.filter((entry) => entry.id !== entryId),
    updatedAt,
  };
};

export const movePlaylistEntry = (
  playlist: Playlist,
  fromIndex: number,
  toIndex: number,
  updatedAt: string = new Date().toISOString(),
): Playlist => {
  return {
    ...playlist,
    items: moveItem(playlist.items, fromIndex, toIndex),
    updatedAt,
  };
};