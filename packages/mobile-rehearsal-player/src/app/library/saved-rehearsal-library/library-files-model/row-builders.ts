import { compact } from 'es-toolkit/compat';

import {
  createLoopPlayableItem,
  type NamedLoop,
  type Playlist,
  type RehearsalLibraryFileLinkNode,
  type RehearsalLibraryFileTree,
  type RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import {
  formatDurationLabel,
  type DriveLibrarySource,
} from '../../drive/utils/drive-library-view-model';
import { formatSavedLoopParentTrackLabel } from '../../loops/utils/saved-loop-view-model';

import type {
  LibraryFilesFolderChildCounts,
  LibraryFilesFolderRow,
  LibraryFilesLoopRow,
  LibraryFilesPlaylistRow,
  LibraryFilesTrackRow,
} from './types';

type LibraryFilesEntityNameByKey = Map<string, string>;

const DEFAULT_UNAVAILABLE_TRACK_MESSAGE =
  'This saved track is not currently available for playback.';
const DEFAULT_UNAVAILABLE_LOOP_MESSAGE =
  'This saved loop is not currently available for playback.';
const MISSING_LOOP_SOURCE_MESSAGE =
  'Restore the parent track before playing this saved loop.';

const formatPluralizedCount = (count: number, noun: string) => {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
};

const formatPluralizedItemCount = (count: number) => {
  return formatPluralizedCount(count, 'item');
};

const formatFolderSupportingLabel = (counts: LibraryFilesFolderChildCounts) => {
  if (counts.totalCount === 0) {
    return formatPluralizedItemCount(0);
  }

  if (counts.unknownCount > 0) {
    return formatPluralizedItemCount(counts.totalCount);
  }

  const musicSegments = compact([
    counts.trackCount > 0
      ? formatPluralizedCount(counts.trackCount, 'track')
      : undefined,
    counts.loopCount > 0
      ? formatPluralizedCount(counts.loopCount, 'loop')
      : undefined,
    counts.playlistCount > 0
      ? formatPluralizedCount(counts.playlistCount, 'playlist')
      : undefined,
  ]);
  const folderSegment =
    counts.folderCount > 0
      ? formatPluralizedCount(counts.folderCount, 'folder')
      : undefined;

  if (musicSegments.length === 0) {
    return folderSegment ?? formatPluralizedItemCount(counts.totalCount);
  }

  if (musicSegments.length === 1 && folderSegment) {
    return `${musicSegments[0]} • ${folderSegment}`;
  }

  return musicSegments.join(' • ');
};

const createEntityReferenceKey = (
  entityKind: RehearsalLibraryFileLinkNode['entityKind'],
  entityId: string,
) => {
  return `${entityKind}:${entityId}`;
};

export const buildEntityNameByKey = (options: {
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
  savedSources: DriveLibrarySource[];
}): LibraryFilesEntityNameByKey => {
  const names = new Map<string, string>();

  for (const source of options.savedSources) {
    names.set(createEntityReferenceKey('track', source.id), source.name);
  }

  for (const loop of options.savedLoops) {
    names.set(createEntityReferenceKey('loop', loop.id), loop.name);
  }

  for (const playlist of options.savedPlaylists) {
    names.set(createEntityReferenceKey('playlist', playlist.id), playlist.name);
  }

  return names;
};

const resolveFileLinkLabel = (options: {
  entityNameByKey: LibraryFilesEntityNameByKey;
  fileLink: RehearsalLibraryFileLinkNode;
}) => {
  return (
    options.fileLink.visibleName ??
    options.entityNameByKey.get(
      createEntityReferenceKey(
        options.fileLink.entityKind,
        options.fileLink.entityId,
      ),
    ) ??
    options.fileLink.entityId
  );
};

export const buildFolderChildCounts = (options: {
  folderId: string;
  tree: RehearsalLibraryFileTree;
}): LibraryFilesFolderChildCounts => {
  const counts: LibraryFilesFolderChildCounts = {
    folderCount: 0,
    loopCount: 0,
    playlistCount: 0,
    totalCount: 0,
    trackCount: 0,
    unknownCount: 0,
  };

  for (const folder of options.tree.folders) {
    if (folder.parentFolderId !== options.folderId) {
      continue;
    }

    counts.folderCount += 1;
    counts.totalCount += 1;
  }

  for (const fileLink of options.tree.fileLinks) {
    if (fileLink.parentFolderId !== options.folderId) {
      continue;
    }

    counts.totalCount += 1;

    switch (fileLink.entityKind) {
      case 'loop':
        counts.loopCount += 1;
        break;
      case 'playlist':
        counts.playlistCount += 1;
        break;
      case 'track':
        counts.trackCount += 1;
        break;
      default:
        counts.unknownCount += 1;
        break;
    }
  }

  return counts;
};

export const buildFolderRow = (options: {
  childCounts: LibraryFilesFolderChildCounts;
  folder: RehearsalLibraryFolderNode;
}): LibraryFilesFolderRow => {
  return {
    childCount: options.childCounts.totalCount,
    folder: options.folder,
    kind: 'folder',
    label: options.folder.name,
    supportingLabel: formatFolderSupportingLabel(options.childCounts),
  };
};

export const buildTrackRow = (options: {
  entityNameByKey: LibraryFilesEntityNameByKey;
  fileLink: RehearsalLibraryFileLinkNode;
  source: DriveLibrarySource;
}): LibraryFilesTrackRow => {
  const durationLabel = options.source.durationMs
    ? formatDurationLabel(options.source.durationMs)
    : null;
  const availabilityLabel =
    options.source.availability.status === 'available'
      ? durationLabel
        ? `Track • ${durationLabel}`
        : 'Track'
      : 'Track unavailable';

  return {
    fileLink: options.fileLink,
    isPlayable: options.source.availability.status === 'available',
    kind: 'track',
    label: resolveFileLinkLabel(options),
    message:
      options.source.availability.status === 'available'
        ? undefined
        : (options.source.availability.message ??
          DEFAULT_UNAVAILABLE_TRACK_MESSAGE),
    source: options.source,
    supportingLabel: availabilityLabel,
  };
};

export const buildLoopRow = (options: {
  entityNameByKey: LibraryFilesEntityNameByKey;
  fileLink: RehearsalLibraryFileLinkNode;
  loop: NamedLoop;
  source: DriveLibrarySource | null;
}): LibraryFilesLoopRow => {
  const playableItem =
    options.source && options.source.availability.status === 'available'
      ? createLoopPlayableItem(options.loop, options.source)
      : null;

  const parentTrackName = options.source?.name ?? options.loop.sourceName;

  return {
    fileLink: options.fileLink,
    kind: 'loop',
    label: resolveFileLinkLabel(options),
    loop: options.loop,
    message: !options.source
      ? MISSING_LOOP_SOURCE_MESSAGE
      : options.source.availability.status === 'available'
        ? undefined
        : (options.source.availability.message ??
          DEFAULT_UNAVAILABLE_LOOP_MESSAGE),
    playableItem,
    source: options.source,
    supportingLabel: formatSavedLoopParentTrackLabel({
      loop: options.loop,
      parentTrackName,
    }),
  };
};

export const buildPlaylistRow = (options: {
  entityNameByKey: LibraryFilesEntityNameByKey;
  fileLink: RehearsalLibraryFileLinkNode;
  playlist: Playlist;
}): LibraryFilesPlaylistRow => {
  return {
    fileLink: options.fileLink,
    kind: 'playlist',
    label: resolveFileLinkLabel(options),
    playlist: options.playlist,
    supportingLabel: formatPluralizedItemCount(options.playlist.items.length),
  };
};
