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
  type RehearsalLibraryFolderNode,
  type RehearsalQueueMode,
  type RepeatMode,
} from '@org/audio-library-models';
import { flatMap, keyBy, size } from 'es-toolkit/compat';

export type PlaybackQueue = {
  playlistId: string;
  mode: RehearsalQueueMode;
  repeatMode: RepeatMode;
  items: PlayableItem[];
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

  return flatMap(normalizedPlaylist.items, (entry) => {
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
};

export const resolveRehearsalLibraryFolderSubtreeIds = (
  folderId: string,
  folders: RehearsalLibraryFolderNode[],
): Set<string> => {
  const subtreeFolderIds = new Set<string>();
  const pendingFolderIds = [folderId];

  while (pendingFolderIds.length > 0) {
    const nextFolderId = pendingFolderIds.pop();

    if (!nextFolderId || subtreeFolderIds.has(nextFolderId)) {
      continue;
    }

    subtreeFolderIds.add(nextFolderId);

    for (const folder of folders) {
      if (folder.parentFolderId === nextFolderId) {
        pendingFolderIds.push(folder.id);
      }
    }
  }

  return subtreeFolderIds;
};

export const resolveFolderPlayableItems = (
  folder: RehearsalLibraryFolderNode,
  folders: RehearsalLibraryFolderNode[],
  fileLinks: RehearsalLibraryFileLinkNode[],
  loops: NamedLoop[],
  sources: DriveAudioSource[],
): PlayableItem[] => {
  const subtreeFolderIds = resolveRehearsalLibraryFolderSubtreeIds(
    folder.id,
    folders,
  );
  const loopsById: Partial<Record<string, NamedLoop>> = keyBy(
    loops,
    (loop) => loop.id,
  );
  const sourcesById: Partial<Record<string, DriveAudioSource>> = keyBy(
    sources,
    (source) => source.id,
  );

  const items = flatMap(fileLinks, (fileLink) => {
    if (!subtreeFolderIds.has(fileLink.parentFolderId)) {
      return [];
    }

    if (fileLink.entityKind === 'track') {
      const source = sourcesById[fileLink.entityId];

      return source && isSourcePlayable(source)
        ? [createTrackPlayableItem(source)]
        : [];
    }

    if (fileLink.entityKind === 'loop') {
      const loop = loopsById[fileLink.entityId];
      const source = loop ? sourcesById[loop.sourceId] : undefined;

      return loop && source && isSourcePlayable(source)
        ? [createLoopPlayableItem(loop, source)]
        : [];
    }

    return [];
  });

  return [...items].sort((left, right) => {
    return left.title.localeCompare(right.title, undefined, {
      sensitivity: 'base',
    });
  });
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
