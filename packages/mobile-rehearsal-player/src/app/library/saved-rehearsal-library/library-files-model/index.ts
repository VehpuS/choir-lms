import type {
  NamedLoop,
  Playlist,
  RehearsalLibraryFileTree,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import {
  matchesAvailabilityFilter,
  matchesEntityFilter,
  matchesSelectedTags,
  normalizeSearchQuery,
  normalizeSelectedTags,
} from '../../search/utils/saved-library-search-view-model';
import {
  buildEntityNameByKey,
  buildFolderChildCounts,
  buildFolderRow,
  buildLoopRow,
  buildPlaylistRow,
  buildTrackRow,
} from './row-builders';
import type {
  LibraryFilesBreadcrumb,
  LibraryFilesExplorerState,
  LibraryFilesRow,
  LibraryFilesSearchOptions,
  LibraryFilesSortMode,
} from './types';

const normalizeName = (value: string) => {
  return value.toLocaleLowerCase();
};

const DEFAULT_LIBRARY_FILES_SORT_MODE: LibraryFilesSortMode = 'name';

const NON_FOLDER_TYPE_ORDER: Record<
  Exclude<LibraryFilesRow['kind'], 'folder'>,
  number
> = {
  track: 0,
  loop: 1,
  playlist: 2,
};

const compareLabels = (leftLabel: string, rightLabel: string) => {
  return normalizeName(leftLabel).localeCompare(normalizeName(rightLabel));
};

const parseTimestamp = (value?: string) => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsedValue = Date.parse(value);

  return Number.isNaN(parsedValue) ? Number.NEGATIVE_INFINITY : parsedValue;
};

export const getLibraryFilesRowNodeKey = (row: LibraryFilesRow) => {
  return row.kind === 'folder' ? row.folder.id : row.fileLink.id;
};

const resolveRowDateAddedTimestamp = (row: LibraryFilesRow) => {
  switch (row.kind) {
    case 'folder':
      return Number.NEGATIVE_INFINITY;
    case 'track':
      return parseTimestamp(row.source.modifiedTime);
    case 'loop':
      return parseTimestamp(row.loop.createdAt);
    case 'playlist':
      return parseTimestamp(row.playlist.createdAt);
  }
};

const resolveRowDateOpenedTimestamp = (
  row: LibraryFilesRow,
  openedAtByNodeKey: Readonly<Record<string, string>>,
) => {
  return parseTimestamp(openedAtByNodeKey[getLibraryFilesRowNodeKey(row)]);
};

const compareRowsByName = (left: LibraryFilesRow, right: LibraryFilesRow) => {
  return compareLabels(left.label, right.label);
};

const compareRowsByType = (
  left: Exclude<LibraryFilesRow, { kind: 'folder' }>,
  right: Exclude<LibraryFilesRow, { kind: 'folder' }>,
) => {
  const leftTypeOrder = NON_FOLDER_TYPE_ORDER[left.kind];
  const rightTypeOrder = NON_FOLDER_TYPE_ORDER[right.kind];

  if (leftTypeOrder !== rightTypeOrder) {
    return leftTypeOrder - rightTypeOrder;
  }

  return compareRowsByName(left, right);
};

const compareRowsByDescendingTimestamp = (
  leftTimestamp: number,
  rightTimestamp: number,
  left: LibraryFilesRow,
  right: LibraryFilesRow,
) => {
  if (leftTimestamp !== rightTimestamp) {
    return rightTimestamp - leftTimestamp;
  }

  return compareRowsByName(left, right);
};

const sortRows = (options: {
  openedAtByNodeKey?: Readonly<Record<string, string>>;
  rows: LibraryFilesRow[];
  sortMode?: LibraryFilesSortMode;
}) => {
  const sortMode = options.sortMode ?? DEFAULT_LIBRARY_FILES_SORT_MODE;
  const openedAtByNodeKey = options.openedAtByNodeKey ?? {};
  const folderRows = options.rows.filter((row) => {
    return row.kind === 'folder';
  });
  const fileRows = options.rows.filter((row) => {
    return row.kind !== 'folder';
  });
  const compareRows = (left: LibraryFilesRow, right: LibraryFilesRow) => {
    switch (sortMode) {
      case 'type':
        return left.kind === 'folder' || right.kind === 'folder'
          ? compareRowsByName(left, right)
          : compareRowsByType(left, right);
      case 'date-added':
        return compareRowsByDescendingTimestamp(
          resolveRowDateAddedTimestamp(left),
          resolveRowDateAddedTimestamp(right),
          left,
          right,
        );
      case 'date-opened':
        return compareRowsByDescendingTimestamp(
          resolveRowDateOpenedTimestamp(left, openedAtByNodeKey),
          resolveRowDateOpenedTimestamp(right, openedAtByNodeKey),
          left,
          right,
        );
      case 'name':
      default:
        return compareRowsByName(left, right);
    }
  };

  return [
    ...[...folderRows].sort(compareRows),
    ...[...fileRows].sort(compareRows),
  ];
};

const matchesSearchText = (
  normalizedQuery: string,
  values: Array<string | undefined>,
) => {
  if (!normalizedQuery) {
    return true;
  }

  return values.some((value) => {
    return value ? normalizeName(value).includes(normalizedQuery) : false;
  });
};

const buildFoldersById = (tree: RehearsalLibraryFileTree) => {
  return new Map(
    tree.folders.map((folder) => {
      return [folder.id, folder] as const;
    }),
  );
};

export const buildLibraryFolderPathLabel = (
  foldersById: ReadonlyMap<string, RehearsalLibraryFolderNode>,
  folder: RehearsalLibraryFolderNode,
) => {
  const labels = [folder.name];
  let parentFolderId = folder.parentFolderId;

  while (parentFolderId) {
    const parentFolder = foldersById.get(parentFolderId);

    if (!parentFolder) {
      break;
    }

    labels.unshift(parentFolder.name);
    parentFolderId = parentFolder.parentFolderId;
  }

  return labels.join(' / ');
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

const buildScopedFolderIds = (options: {
  currentFolder: RehearsalLibraryFolderNode;
  searchScope: LibraryFilesSearchOptions['searchScope'];
  tree: RehearsalLibraryFileTree;
}) => {
  if (options.searchScope === 'all-files') {
    return new Set(
      options.tree.folders.map((folder) => {
        return folder.id;
      }),
    );
  }

  const scopedFolderIds = new Set<string>();
  const pendingFolderIds = [options.currentFolder.id];

  while (pendingFolderIds.length > 0) {
    const nextFolderId = pendingFolderIds.pop();

    if (!nextFolderId || scopedFolderIds.has(nextFolderId)) {
      continue;
    }

    scopedFolderIds.add(nextFolderId);

    for (const folder of options.tree.folders) {
      if (folder.parentFolderId === nextFolderId) {
        pendingFolderIds.push(folder.id);
      }
    }
  }

  return scopedFolderIds;
};

const prefixContainingPath = (options: {
  currentFolderId: string;
  foldersById: ReadonlyMap<string, RehearsalLibraryFolderNode>;
  parentFolderId: string | null;
  supportingLabel: string;
}) => {
  if (
    !options.parentFolderId ||
    options.parentFolderId === options.currentFolderId
  ) {
    return options.supportingLabel;
  }

  const containingFolder = options.foldersById.get(options.parentFolderId);

  if (!containingFolder) {
    return options.supportingLabel;
  }

  return `${buildLibraryFolderPathLabel(options.foldersById, containingFolder)} • ${options.supportingLabel}`;
};

const buildDefaultRows = (options: {
  currentFolder: RehearsalLibraryFolderNode;
  entityNameByKey: ReturnType<typeof buildEntityNameByKey>;
  openedAtByNodeKey?: Readonly<Record<string, string>>;
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
  savedSources: DriveLibrarySource[];
  sortMode?: LibraryFilesSortMode;
  tree: RehearsalLibraryFileTree;
}) => {
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
      return folder.parentFolderId === options.currentFolder.id;
    })
    .map((folder) => {
      return buildFolderRow({
        childCounts: buildFolderChildCounts({
          folderId: folder.id,
          tree: options.tree,
        }),
        folder,
      });
    });
  const entityRows = options.tree.fileLinks.flatMap((fileLink) => {
    if (fileLink.parentFolderId !== options.currentFolder.id) {
      return [] as LibraryFilesRow[];
    }

    if (fileLink.entityKind === 'track') {
      const source = savedSourcesById.get(fileLink.entityId);

      return source
        ? [
            buildTrackRow({
              entityNameByKey: options.entityNameByKey,
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
              entityNameByKey: options.entityNameByKey,
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
            entityNameByKey: options.entityNameByKey,
            fileLink,
            playlist,
          }),
        ]
      : [];
  });

  return sortRows({
    openedAtByNodeKey: options.openedAtByNodeKey,
    rows: [...childFolders, ...entityRows],
    sortMode: options.sortMode,
  });
};

const buildSearchRows = (options: {
  currentFolder: RehearsalLibraryFolderNode;
  entityNameByKey: ReturnType<typeof buildEntityNameByKey>;
  foldersById: ReadonlyMap<string, RehearsalLibraryFolderNode>;
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
  savedSources: DriveLibrarySource[];
  searchOptions: LibraryFilesSearchOptions;
  tree: RehearsalLibraryFileTree;
}) => {
  const normalizedQuery = normalizeSearchQuery(
    options.searchOptions.activeSearchQuery ?? '',
  );
  const selectedTags = normalizeSelectedTags(
    options.searchOptions.selectedTagFilters,
  );
  const scopedFolderIds = buildScopedFolderIds({
    currentFolder: options.currentFolder,
    searchScope: options.searchOptions.searchScope,
    tree: options.tree,
  });
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

  const folderRows =
    options.searchOptions.entityFilter === 'all' &&
    options.searchOptions.availabilityFilter === 'all'
      ? options.tree.folders.flatMap((folder) => {
          if (
            folder.id === options.currentFolder.id ||
            !scopedFolderIds.has(folder.id) ||
            !matchesSearchText(normalizedQuery, [folder.name]) ||
            !matchesSelectedTags({
              selectedTags,
              tags: folder.tags,
            })
          ) {
            return [] as LibraryFilesRow[];
          }

          const row = buildFolderRow({
            childCounts: buildFolderChildCounts({
              folderId: folder.id,
              tree: options.tree,
            }),
            folder,
          });

          return [
            {
              ...row,
              supportingLabel: prefixContainingPath({
                currentFolderId: options.currentFolder.id,
                foldersById: options.foldersById,
                parentFolderId: folder.parentFolderId,
                supportingLabel: row.supportingLabel,
              }),
            },
          ];
        })
      : [];

  const entityRows = options.tree.fileLinks.flatMap((fileLink) => {
    if (!scopedFolderIds.has(fileLink.parentFolderId)) {
      return [] as LibraryFilesRow[];
    }

    if (fileLink.entityKind === 'track') {
      if (!matchesEntityFilter(options.searchOptions.entityFilter, 'tracks')) {
        return [] as LibraryFilesRow[];
      }

      const source = savedSourcesById.get(fileLink.entityId);

      if (
        !source ||
        !matchesAvailabilityFilter({
          availabilityFilter: options.searchOptions.availabilityFilter,
          isAvailable: source.availability.status === 'available',
        }) ||
        !matchesSelectedTags({
          selectedTags,
          tags: source.tags,
        })
      ) {
        return [] as LibraryFilesRow[];
      }

      const row = buildTrackRow({
        entityNameByKey: options.entityNameByKey,
        fileLink,
        source,
      });

      if (!matchesSearchText(normalizedQuery, [row.label, source.name])) {
        return [] as LibraryFilesRow[];
      }

      return [
        {
          ...row,
          supportingLabel: prefixContainingPath({
            currentFolderId: options.currentFolder.id,
            foldersById: options.foldersById,
            parentFolderId: fileLink.parentFolderId,
            supportingLabel: row.supportingLabel,
          }),
        },
      ];
    }

    if (fileLink.entityKind === 'loop') {
      if (!matchesEntityFilter(options.searchOptions.entityFilter, 'loops')) {
        return [] as LibraryFilesRow[];
      }

      const loop = savedLoopsById.get(fileLink.entityId);
      const source = loop
        ? (savedSourcesById.get(loop.sourceId) ?? null)
        : null;

      if (
        !loop ||
        !matchesAvailabilityFilter({
          availabilityFilter: options.searchOptions.availabilityFilter,
          isAvailable: source?.availability.status === 'available',
        }) ||
        !matchesSelectedTags({
          selectedTags,
          tags: loop.tags,
        })
      ) {
        return [] as LibraryFilesRow[];
      }

      const row = buildLoopRow({
        entityNameByKey: options.entityNameByKey,
        fileLink,
        loop,
        source,
      });

      if (
        !matchesSearchText(normalizedQuery, [
          row.label,
          loop.name,
          loop.sourceName,
        ])
      ) {
        return [] as LibraryFilesRow[];
      }

      return [
        {
          ...row,
          supportingLabel: prefixContainingPath({
            currentFolderId: options.currentFolder.id,
            foldersById: options.foldersById,
            parentFolderId: fileLink.parentFolderId,
            supportingLabel: row.supportingLabel,
          }),
        },
      ];
    }

    if (!matchesEntityFilter(options.searchOptions.entityFilter, 'playlists')) {
      return [] as LibraryFilesRow[];
    }

    if (options.searchOptions.availabilityFilter !== 'all') {
      return [] as LibraryFilesRow[];
    }

    const playlist = savedPlaylistsById.get(fileLink.entityId);

    if (
      !playlist ||
      !matchesSelectedTags({
        selectedTags,
        tags: playlist.tags,
      })
    ) {
      return [] as LibraryFilesRow[];
    }

    const row = buildPlaylistRow({
      entityNameByKey: options.entityNameByKey,
      fileLink,
      playlist,
    });

    if (!matchesSearchText(normalizedQuery, [row.label, playlist.name])) {
      return [] as LibraryFilesRow[];
    }

    return [
      {
        ...row,
        supportingLabel: prefixContainingPath({
          currentFolderId: options.currentFolder.id,
          foldersById: options.foldersById,
          parentFolderId: fileLink.parentFolderId,
          supportingLabel: row.supportingLabel,
        }),
      },
    ];
  });

  return sortRows({
    rows: [...folderRows, ...entityRows],
    sortMode: options.searchOptions.sortMode,
    openedAtByNodeKey: options.searchOptions.openedAtByNodeKey,
  });
};

export const buildLibraryFilesExplorerState = (options: {
  currentFolderId: string;
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
  savedSources: DriveLibrarySource[];
  searchOptions?: LibraryFilesSearchOptions;
  tree: RehearsalLibraryFileTree;
}): LibraryFilesExplorerState => {
  const foldersById = buildFoldersById(options.tree);
  const currentFolder =
    foldersById.get(options.currentFolderId) ??
    foldersById.get(options.tree.rootFolderId) ??
    options.tree.folders[0];

  if (!currentFolder) {
    throw new Error('Library Files requires a root folder.');
  }

  const entityNameByKey = buildEntityNameByKey(options);
  const rows = options.searchOptions?.activeSearchQuery
    ? buildSearchRows({
        currentFolder,
        entityNameByKey,
        foldersById,
        savedLoops: options.savedLoops,
        savedPlaylists: options.savedPlaylists,
        savedSources: options.savedSources,
        searchOptions: options.searchOptions,
        tree: options.tree,
      })
    : buildDefaultRows({
        currentFolder,
        entityNameByKey,
        openedAtByNodeKey: options.searchOptions?.openedAtByNodeKey,
        savedLoops: options.savedLoops,
        savedPlaylists: options.savedPlaylists,
        savedSources: options.savedSources,
        sortMode: options.searchOptions?.sortMode,
        tree: options.tree,
      });

  return {
    breadcrumbs: buildBreadcrumbs({
      currentFolder,
      foldersById,
    }),
    currentFolder,
    rows,
  };
};

export type {
  LibraryFilesBreadcrumb,
  LibraryFilesExplorerState,
  LibraryFilesFolderRow,
  LibraryFilesLoopRow,
  LibraryFilesPlaylistRow,
  LibraryFilesRow,
  LibraryFilesSearchOptions,
  LibraryFilesSearchScope,
  LibraryFilesSortMode,
  LibraryFilesTrackRow,
} from './types';

export { DEFAULT_LIBRARY_FILES_SORT_MODE };
