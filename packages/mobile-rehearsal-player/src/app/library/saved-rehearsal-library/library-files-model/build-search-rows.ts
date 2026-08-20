import type {
  NamedLoop,
  Playlist,
  RehearsalLibraryFileTree,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import {
  matchesEntityFilter,
  matchesSelectedTags,
  normalizeSearchQuery,
  normalizeSelectedTags,
} from '../../search/utils/saved-library-search-view-model';
import { buildScopedFolderIds, prefixContainingPath } from './pathing';
import {
  buildEntityNameByKey,
  buildFolderChildCounts,
  buildFolderRow,
  buildLoopRow,
  buildPlaylistRow,
  buildTrackRow,
} from './row-builders';
import { sortRows } from './sort';
import type { LibraryFilesRow, LibraryFilesSearchOptions } from './types';

const normalizeName = (value: string) => {
  return value.toLocaleLowerCase();
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

export const buildSearchRows = (options: {
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
    options.searchOptions.entityFilter === 'all'
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
    openedAtByNodeKey: options.searchOptions.openedAtByNodeKey,
    rows: [...folderRows, ...entityRows],
    sortDirection: options.searchOptions.sortDirection,
    sortMode: options.searchOptions.sortMode,
  });
};
