import { useCallback, useMemo, useRef } from 'react';

import { type LibrarySelectionServices } from '../../selection/library-selection-services';
import { createLibraryFilesSuccessFeedback } from './library-files-success-feedback';
import type { SavedRehearsalLibrarySectionProps } from './types';

type Options = Pick<
  SavedRehearsalLibrarySectionProps,
  | 'activePlayableItem'
  | 'createPlaylist'
  | 'libraryFiles'
  | 'onShowLibraryFilesSuccessFeedback'
  | 'queuePlayableItemsNext'
  | 'queuePlayableItemsUpNext'
  | 'savedLibrarySources'
  | 'savedLoops'
  | 'savedPlaylists'
  | 'updatePlaylist'
> & { isDestinationActive: boolean };

/**
 * What the Library's selection surfaces read from the screen (see
 * `LibrarySelectionServices`), memoized so a surface's effects do not re-run
 * on every render of the section.
 */
export const useSelectionServicesValue = ({
  activePlayableItem,
  createPlaylist,
  isDestinationActive,
  libraryFiles,
  onShowLibraryFilesSuccessFeedback,
  queuePlayableItemsNext,
  queuePlayableItemsUpNext,
  savedLibrarySources,
  savedLoops,
  savedPlaylists,
  updatePlaylist,
}: Options): LibrarySelectionServices => {
  // `libraryFiles.bulk` is rebuilt on every render; reading it through a ref
  // keeps `updateTags` stable so consumers do not re-run on each render.
  const libraryFilesRef = useRef(libraryFiles);

  libraryFilesRef.current = libraryFiles;

  const updateTags = useCallback<LibrarySelectionServices['updateTags']>(
    (change) => libraryFilesRef.current.bulk.updateTags(change),
    [],
  );

  return useMemo(
    () => ({
      acknowledge: ({ action, message, title, undo }) => {
        onShowLibraryFilesSuccessFeedback(
          createLibraryFilesSuccessFeedback({ action, message, title, undo }),
        );
      },
      canQueue: activePlayableItem !== null,
      collections: {
        loops: savedLoops,
        playlists: savedPlaylists,
        sources: savedLibrarySources,
      },
      createPlaylist,
      files: libraryFiles,
      folders: libraryFiles.folders,
      isDestinationActive,
      queueItemsNext: queuePlayableItemsNext,
      queueItemsUpNext: queuePlayableItemsUpNext,
      updatePlaylist,
      updateTags,
    }),
    [
      activePlayableItem,
      createPlaylist,
      isDestinationActive,
      libraryFiles,
      onShowLibraryFilesSuccessFeedback,
      queuePlayableItemsNext,
      queuePlayableItemsUpNext,
      savedLibrarySources,
      savedLoops,
      savedPlaylists,
      updatePlaylist,
      updateTags,
    ],
  );
};
