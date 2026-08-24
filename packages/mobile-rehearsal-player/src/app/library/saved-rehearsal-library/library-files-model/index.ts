import type {
  NamedLoop,
  Playlist,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { buildDefaultRows } from './build-default-rows';
import { buildSearchRows } from './build-search-rows';
import {
  buildBreadcrumbs,
  buildFoldersById,
  buildLibraryFolderPathLabel,
} from './pathing';
import { buildEntityNameByKey } from './row-builders';
import {
  DEFAULT_LIBRARY_FILES_SORT_DIRECTION,
  DEFAULT_LIBRARY_FILES_SORT_MODE,
  getLibraryFilesRowNodeKey,
  parseTimestamp,
} from './sort';
import type {
  LibraryFilesExplorerState,
  LibraryFilesSearchOptions,
} from './types';

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
        entityFilter: options.searchOptions?.entityFilter,
        entityNameByKey,
        openedAtByNodeKey: options.searchOptions?.openedAtByNodeKey,
        savedLoops: options.savedLoops,
        savedPlaylists: options.savedPlaylists,
        savedSources: options.savedSources,
        selectedTagFilters: options.searchOptions?.selectedTagFilters,
        sortDirection: options.searchOptions?.sortDirection,
        sortMode: options.searchOptions?.sortMode,
        tagFilterMatchMode: options.searchOptions?.tagFilterMatchMode,
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
  LibraryFilesSortDirection,
  LibraryFilesSortMode,
  LibraryFilesTrackRow,
} from './types';

export {
  buildLibraryFolderPathLabel,
  DEFAULT_LIBRARY_FILES_SORT_DIRECTION,
  DEFAULT_LIBRARY_FILES_SORT_MODE,
  getLibraryFilesRowNodeKey,
  parseTimestamp,
};
