import { useMemo } from 'react';

import { type LibrarySelectionServices } from '../../selection/library-selection-services';
import { createLibraryFilesSuccessFeedback } from './library-files-success-feedback';
import type { SavedRehearsalLibrarySectionProps } from './types';

type Options = Pick<
  SavedRehearsalLibrarySectionProps,
  | 'activePlayableItem'
  | 'createPlaylist'
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
  onShowLibraryFilesSuccessFeedback,
  queuePlayableItemsNext,
  queuePlayableItemsUpNext,
  savedLibrarySources,
  savedLoops,
  savedPlaylists,
  updatePlaylist,
}: Options): LibrarySelectionServices =>
  useMemo(
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
      isDestinationActive,
      queueItemsNext: queuePlayableItemsNext,
      queueItemsUpNext: queuePlayableItemsUpNext,
      updatePlaylist,
    }),
    [
      activePlayableItem,
      createPlaylist,
      isDestinationActive,
      onShowLibraryFilesSuccessFeedback,
      queuePlayableItemsNext,
      queuePlayableItemsUpNext,
      savedLibrarySources,
      savedLoops,
      savedPlaylists,
      updatePlaylist,
    ],
  );
