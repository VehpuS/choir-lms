import type { RehearsalLibraryFileTree } from '@org/audio-library-models';
import { useMemo } from 'react';

import { createFilesPlaybackExpansionContext } from '../../saved-rehearsal-library/files-selection';
import type { LibraryFilesSearchOptions } from '../../saved-rehearsal-library/library-files-model';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import { useLibrarySelectionServices } from '../../selection/library-selection-services';

const EMPTY_TREE: RehearsalLibraryFileTree = {
  fileLinks: [],
  folders: [],
  rootFolderId: '',
  version: 1,
};

/**
 * How the Files view expands folders and playlists into their audio, for the
 * playback and offline bulk actions. An unloaded tree expands to nothing.
 */
export const useFilesExpansionContext = (options: {
  searchOptions: LibraryFilesSearchOptions;
  tree: UseLibraryFilesResult['tree'];
}) => {
  const { collections } = useLibrarySelectionServices();
  const { searchOptions, tree } = options;

  return useMemo(
    () =>
      createFilesPlaybackExpansionContext({
        savedLoops: collections.loops,
        savedPlaylists: collections.playlists,
        savedSources: collections.sources,
        searchOptions,
        tree: tree ?? EMPTY_TREE,
      }),
    [collections, searchOptions, tree],
  );
};
