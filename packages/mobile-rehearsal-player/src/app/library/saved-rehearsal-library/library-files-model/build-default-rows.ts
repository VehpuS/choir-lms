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
  normalizeSelectedTags,
  type LibrarySearchEntityFilter,
  type TagFilterMatchMode,
} from '../../search/utils/saved-library-search-view-model';
import { folderContainsMatchingEntity } from './folder-contains-matching-entity';
import {
  buildEntityNameByKey,
  buildFolderChildCounts,
  buildFolderRow,
  buildLoopRow,
  buildPlaylistRow,
  buildTrackRow,
} from './row-builders';
import { sortRows } from './sort';
import type {
  LibraryFilesRow,
  LibraryFilesSortDirection,
  LibraryFilesSortMode,
} from './types';

export const buildDefaultRows = (options: {
  currentFolder: RehearsalLibraryFolderNode;
  entityFilter?: LibrarySearchEntityFilter;
  entityNameByKey: ReturnType<typeof buildEntityNameByKey>;
  openedAtByNodeKey?: Readonly<Record<string, string>>;
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
  savedSources: DriveLibrarySource[];
  selectedTagFilters?: string[];
  sortDirection?: LibraryFilesSortDirection;
  sortMode?: LibraryFilesSortMode;
  tagFilterMatchMode?: TagFilterMatchMode;
  tree: RehearsalLibraryFileTree;
}) => {
  const entityFilter = options.entityFilter ?? 'all';
  const selectedTags = normalizeSelectedTags(options.selectedTagFilters ?? []);
  const tagFilterMatchMode = options.tagFilterMatchMode ?? 'all';
  const hasActiveFilter = entityFilter !== 'all' || selectedTags.length > 0;
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
    .filter((folder) => {
      if (!hasActiveFilter) {
        return true;
      }

      if (
        selectedTags.length > 0 &&
        matchesSelectedTags({
          matchMode: tagFilterMatchMode,
          selectedTags,
          tags: folder.tags,
        })
      ) {
        return true;
      }

      return folderContainsMatchingEntity({
        entityFilter,
        folderId: folder.id,
        matchMode: tagFilterMatchMode,
        savedLoopsById,
        savedPlaylistsById,
        savedSourcesById,
        selectedTags,
        tree: options.tree,
      });
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
      if (hasActiveFilter && !matchesEntityFilter(entityFilter, 'tracks')) {
        return [] as LibraryFilesRow[];
      }

      const source = savedSourcesById.get(fileLink.entityId);

      if (
        !source ||
        (hasActiveFilter &&
          !matchesSelectedTags({
            matchMode: tagFilterMatchMode,
            selectedTags,
            tags: source.tags,
          }))
      ) {
        return [] as LibraryFilesRow[];
      }

      return [
        buildTrackRow({
          entityNameByKey: options.entityNameByKey,
          fileLink,
          source,
        }),
      ];
    }

    if (fileLink.entityKind === 'loop') {
      if (hasActiveFilter && !matchesEntityFilter(entityFilter, 'loops')) {
        return [] as LibraryFilesRow[];
      }

      const loop = savedLoopsById.get(fileLink.entityId);

      if (
        !loop ||
        (hasActiveFilter &&
          !matchesSelectedTags({
            matchMode: tagFilterMatchMode,
            selectedTags,
            tags: loop.tags,
          }))
      ) {
        return [] as LibraryFilesRow[];
      }

      return [
        buildLoopRow({
          entityNameByKey: options.entityNameByKey,
          fileLink,
          loop,
          source: savedSourcesById.get(loop.sourceId) ?? null,
        }),
      ];
    }

    if (hasActiveFilter && !matchesEntityFilter(entityFilter, 'playlists')) {
      return [] as LibraryFilesRow[];
    }

    const playlist = savedPlaylistsById.get(fileLink.entityId);

    if (
      !playlist ||
      (hasActiveFilter &&
        !matchesSelectedTags({
          matchMode: tagFilterMatchMode,
          selectedTags,
          tags: playlist.tags,
        }))
    ) {
      return [] as LibraryFilesRow[];
    }

    return [
      buildPlaylistRow({
        entityNameByKey: options.entityNameByKey,
        fileLink,
        playlist,
      }),
    ];
  });

  return sortRows({
    openedAtByNodeKey: options.openedAtByNodeKey,
    rows: [...childFolders, ...entityRows],
    sortDirection: options.sortDirection,
    sortMode: options.sortMode,
  });
};
