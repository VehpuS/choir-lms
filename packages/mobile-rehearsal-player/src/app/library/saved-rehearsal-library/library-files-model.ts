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
} from '../drive/utils/drive-library-view-model';

type LibraryFilesEntityNameByKey = Map<string, string>;

export type LibraryFilesBreadcrumb = {
  folderId: string;
  label: string;
};

export type LibraryFilesFolderRow = {
  childCount: number;
  folder: RehearsalLibraryFolderNode;
  kind: 'folder';
  label: string;
  supportingLabel: string;
};

export type LibraryFilesTrackRow = {
  fileLink: RehearsalLibraryFileLinkNode;
  isPlayable: boolean;
  kind: 'track';
  label: string;
  message?: string;
  source: DriveLibrarySource;
  supportingLabel: string;
};

export type LibraryFilesLoopRow = {
  fileLink: RehearsalLibraryFileLinkNode;
  kind: 'loop';
  label: string;
  loop: NamedLoop;
  message?: string;
  playableItem: ReturnType<typeof createLoopPlayableItem> | null;
  source: DriveLibrarySource | null;
  supportingLabel: string;
};

export type LibraryFilesPlaylistRow = {
  fileLink: RehearsalLibraryFileLinkNode;
  kind: 'playlist';
  label: string;
  playlist: Playlist;
  supportingLabel: string;
};

export type LibraryFilesRow =
  | LibraryFilesFolderRow
  | LibraryFilesTrackRow
  | LibraryFilesLoopRow
  | LibraryFilesPlaylistRow;

export type LibraryFilesExplorerState = {
  breadcrumbs: LibraryFilesBreadcrumb[];
  currentFolder: RehearsalLibraryFolderNode;
  rows: LibraryFilesRow[];
};

const DEFAULT_UNAVAILABLE_TRACK_MESSAGE =
  'This saved track is not currently available for playback.';
const DEFAULT_UNAVAILABLE_LOOP_MESSAGE =
  'This saved loop is not currently available for playback.';
const MISSING_LOOP_SOURCE_MESSAGE =
  'Restore the parent track before playing this saved loop.';

const normalizeName = (value: string) => {
  return value.toLocaleLowerCase();
};

const formatPluralizedItemCount = (count: number) => {
  return `${count} item${count === 1 ? '' : 's'}`;
};

const formatLoopRangeLabel = (loop: Pick<NamedLoop, 'startMs' | 'endMs'>) => {
  const startLabel = formatDurationLabel(loop.startMs) ?? '0:00';
  const endLabel = formatDurationLabel(loop.endMs) ?? '0:00';

  return `${startLabel} to ${endLabel}`;
};

const createEntityReferenceKey = (
  entityKind: RehearsalLibraryFileLinkNode['entityKind'],
  entityId: string,
) => {
  return `${entityKind}:${entityId}`;
};

const buildEntityNameByKey = (options: {
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

const sortRowsByLabel = <Row extends { label: string }>(rows: Row[]) => {
  return [...rows].sort((left, right) => {
    return normalizeName(left.label).localeCompare(normalizeName(right.label));
  });
};

const buildFolderRow = (options: {
  childCount: number;
  folder: RehearsalLibraryFolderNode;
}): LibraryFilesFolderRow => {
  return {
    childCount: options.childCount,
    folder: options.folder,
    kind: 'folder',
    label: options.folder.name,
    supportingLabel: formatPluralizedItemCount(options.childCount),
  };
};

const buildTrackRow = (options: {
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

const buildLoopRow = (options: {
  entityNameByKey: LibraryFilesEntityNameByKey;
  fileLink: RehearsalLibraryFileLinkNode;
  loop: NamedLoop;
  source: DriveLibrarySource | null;
}): LibraryFilesLoopRow => {
  const playableItem =
    options.source && options.source.availability.status === 'available'
      ? createLoopPlayableItem(options.loop, options.source)
      : null;

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
    supportingLabel: `${options.loop.sourceName} • ${formatLoopRangeLabel(options.loop)}`,
  };
};

const buildPlaylistRow = (options: {
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

const buildBreadcrumbs = (options: {
  currentFolder: RehearsalLibraryFolderNode;
  foldersById: ReadonlyMap<string, RehearsalLibraryFolderNode>;
}): LibraryFilesBreadcrumb[] => {
  const breadcrumbs: LibraryFilesBreadcrumb[] = [];
  let currentFolder: RehearsalLibraryFolderNode | undefined =
    options.currentFolder;

  while (currentFolder) {
    breadcrumbs.unshift({
      folderId: currentFolder.id,
      label: currentFolder.name,
    });

    currentFolder = currentFolder.parentFolderId
      ? options.foldersById.get(currentFolder.parentFolderId)
      : undefined;
  }

  return breadcrumbs;
};

export const buildLibraryFilesExplorerState = (options: {
  currentFolderId: string;
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
  savedSources: DriveLibrarySource[];
  tree: RehearsalLibraryFileTree;
}): LibraryFilesExplorerState => {
  const foldersById = new Map(
    options.tree.folders.map((folder) => {
      return [folder.id, folder] as const;
    }),
  );
  const currentFolder =
    foldersById.get(options.currentFolderId) ??
    foldersById.get(options.tree.rootFolderId) ??
    options.tree.folders[0];

  if (!currentFolder) {
    throw new Error('Library Files requires a root folder.');
  }

  const entityNameByKey = buildEntityNameByKey(options);
  const savedSourcesById = new Map(
    options.savedSources.map((source) => {
      return [source.id, source] as const;
    }),
  );
  const savedLoopsById = new Map(
    options.savedLoops.map((loop) => {
      return [loop.id, loop] as const;
    }),
  );
  const savedPlaylistsById = new Map(
    options.savedPlaylists.map((playlist) => {
      return [playlist.id, playlist] as const;
    }),
  );
  const childFolders = options.tree.folders
    .filter((folder) => {
      return folder.parentFolderId === currentFolder.id;
    })
    .map((folder) => {
      const childCount =
        options.tree.folders.filter((childFolder) => {
          return childFolder.parentFolderId === folder.id;
        }).length +
        options.tree.fileLinks.filter((fileLink) => {
          return fileLink.parentFolderId === folder.id;
        }).length;

      return buildFolderRow({
        childCount,
        folder,
      });
    });
  const entityRows = options.tree.fileLinks.flatMap((fileLink) => {
    if (fileLink.parentFolderId !== currentFolder.id) {
      return [] as LibraryFilesRow[];
    }

    if (fileLink.entityKind === 'track') {
      const source = savedSourcesById.get(fileLink.entityId);

      return source
        ? [
            buildTrackRow({
              entityNameByKey,
              fileLink,
              source,
            }),
          ]
        : [];
    }

    if (fileLink.entityKind === 'loop') {
      const loop = savedLoopsById.get(fileLink.entityId);

      return loop
        ? [
            buildLoopRow({
              entityNameByKey,
              fileLink,
              loop,
              source: savedSourcesById.get(loop.sourceId) ?? null,
            }),
          ]
        : [];
    }

    const playlist = savedPlaylistsById.get(fileLink.entityId);

    return playlist
      ? [
          buildPlaylistRow({
            entityNameByKey,
            fileLink,
            playlist,
          }),
        ]
      : [];
  });

  return {
    breadcrumbs: buildBreadcrumbs({
      currentFolder,
      foldersById,
    }),
    currentFolder,
    rows: [...sortRowsByLabel(childFolders), ...sortRowsByLabel(entityRows)],
  };
};