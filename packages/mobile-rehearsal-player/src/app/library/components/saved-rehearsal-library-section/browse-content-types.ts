import type { ReactElement, ReactNode } from 'react';

import type { RehearsalLibraryFolderNode } from '@org/audio-library-models';

import type {
  SavedRehearsalLibraryView,
  SavedRehearsalLibraryVisibleSections,
} from '../../saved-rehearsal-library/detail-mode';
import type { SavedRehearsalLibrarySectionProps } from './types';
import type { useSavedRehearsalLibraryLoopState } from './use-saved-rehearsal-library-loop-state';
import type { useSavedRehearsalLibraryPlaylistState } from './use-saved-rehearsal-library-playlist-state';
import type { useSavedRehearsalLibrarySearch } from './use-saved-rehearsal-library-search';
import type { useSavedRehearsalLibraryTrackPlaylistMenu } from './use-saved-rehearsal-library-track-playlist-menu';

export type SearchState = Pick<
  ReturnType<typeof useSavedRehearsalLibrarySearch>,
  | 'activeLibrarySearchQuery'
  | 'entityFilter'
  | 'filesOpenedAtByNodeKey'
  | 'filesSearchScope'
  | 'filesSortMode'
  | 'recordFilesEntryOpened'
  | 'selectedTagFilters'
  | 'visiblePlaylistCards'
  | 'visibleSavedLibrarySources'
>;

export type PlaylistState = Pick<
  ReturnType<typeof useSavedRehearsalLibraryPlaylistState>,
  | 'cardRenamePlaylistId'
  | 'cardRenamePlaylistName'
  | 'addLoopToSelectedPlaylist'
  | 'addSourceToSelectedPlaylist'
  | 'closeFilesAddItems'
  | 'closeCardRenameDialog'
  | 'handleDeletePlaylist'
  | 'handleRenamePlaylistCard'
  | 'isFilesAddItemsVisible'
  | 'openCardRenameDialog'
  | 'openFilesAddItems'
  | 'openPlaylistDetail'
  | 'selectedCardRenameIssue'
  | 'selectedPlaylist'
  | 'setCardRenamePlaylistName'
>;

export type LoopState = Pick<
  ReturnType<typeof useSavedRehearsalLibraryLoopState>,
  'openTrackLoopView'
>;

export type TrackPlaylistMenuState = Pick<
  ReturnType<typeof useSavedRehearsalLibraryTrackPlaylistMenu>,
  'openLoopPlaylistSelector' | 'openSourcePlaylistSelector'
>;

export type SavedRehearsalLibraryBrowseContentProps = Pick<
  SavedRehearsalLibrarySectionProps,
  | 'activePlayableItem'
  | 'authorization'
  | 'canMutateLibrary'
  | 'canMutateLoops'
  | 'canMutatePlaylists'
  | 'libraryFiles'
  | 'libraryFilesSuccessFeedback'
  | 'onDismissLibraryFilesSuccessFeedback'
  | 'isPlaybackPreparing'
  | 'onOpenLibraryFilesSuccessFeedbackFolder'
  | 'onSelectTag'
  | 'onShowLibraryFilesSuccessFeedback'
  | 'openLoopBuilderForSource'
  | 'pendingLoopBuilderSourceId'
  | 'pendingSourceId'
  | 'playbackIssue'
  | 'playbackState'
  | 'queuePlayableItemNext'
  | 'queuePlayableItemUpNext'
  | 'removeSource'
  | 'savedLibraryIssue'
  | 'savedLibrarySources'
  | 'savedLoops'
  | 'savedPlaylists'
  | 'selectedTrack'
  | 'togglePlaylistPlayback'
  | 'togglePlayableItemPlayback'
  | 'toggleSourcePlayback'
> & {
  canQueueAsNext: boolean;
  isLoopMutating: boolean;
  isPlaylistMutating: boolean;
  isSavedLibraryMutating: boolean;
  loopSection: ReactElement<{ isBuilderFocused?: boolean }>;
  loopState: LoopState;
  playlistSection: ReactNode;
  playlistState: PlaylistState;
  selectedView: SavedRehearsalLibraryView;
  savedSourceTitle: string;
  searchState: SearchState;
  visibleSections: SavedRehearsalLibraryVisibleSections;
  onDoneAddingFilesPlaylistItems: () => void;
  onOpenFilesAddItemsForPlaylist: (options: {
    playlistId: string;
    preferredFolderId?: string | null;
  }) => void;
  onOpenFolderTagEditor: (folder: RehearsalLibraryFolderNode) => void;
  onOpenPlaylistTagEditor: (playlistId: string) => void;
  onPlaylistRenameVisibilityChange?: (isVisible: boolean) => void;
  onOpenLoopTagEditor: (
    loop: SavedRehearsalLibrarySectionProps['savedLoops'][number],
  ) => void;
  onOpenSourceTagEditor: (
    source: SavedRehearsalLibrarySectionProps['savedLibrarySources'][number],
  ) => void;
  trackPlaylistMenu: TrackPlaylistMenuState;
};
