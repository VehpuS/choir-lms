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
} from './types';

const normalizeName = (value: string) => {
  return value.toLocaleLowerCase();
};

const sortRowsByLabel = <Row extends { label: string }>(rows: Row[]) => {
  return [...rows].sort((left, right) => {
    return normalizeName(left.label).localeCompare(normalizeName(right.label));
  });
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
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
  savedSources: DriveLibrarySource[];
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

  return [...sortRowsByLabel(childFolders), ...sortRowsByLabel(entityRows)];
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

  return [...sortRowsByLabel(folderRows), ...sortRowsByLabel(entityRows)];
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
        savedLoops: options.savedLoops,
        savedPlaylists: options.savedPlaylists,
        savedSources: options.savedSources,
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
  LibraryFilesTrackRow,
} from './types';
