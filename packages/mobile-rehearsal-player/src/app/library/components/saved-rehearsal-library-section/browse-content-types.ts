import type { ReactNode } from 'react';

import type { SavedRehearsalLibraryVisibleSections } from '../../saved-rehearsal-library/detail-mode';
import type { SavedRehearsalLibrarySectionProps } from './types';
import type { useSavedRehearsalLibraryLoopState } from './use-saved-rehearsal-library-loop-state';
import type { useSavedRehearsalLibraryPlaylistState } from './use-saved-rehearsal-library-playlist-state';
import type { useSavedRehearsalLibrarySearch } from './use-saved-rehearsal-library-search';
import type { useSavedRehearsalLibraryTrackPlaylistMenu } from './use-saved-rehearsal-library-track-playlist-menu';

export type SearchState = Pick<
  ReturnType<typeof useSavedRehearsalLibrarySearch>,
  | 'activeLibrarySearchQuery'
  | 'visiblePlaylistCards'
  | 'visibleSavedLibrarySources'
>;

export type PlaylistState = Pick<
  ReturnType<typeof useSavedRehearsalLibraryPlaylistState>,
  | 'cardRenamePlaylistId'
  | 'cardRenamePlaylistName'
  | 'closeCardRenameDialog'
  | 'handleDeletePlaylist'
  | 'handleRenamePlaylistCard'
  | 'openCardRenameDialog'
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
  | 'isPlaybackPreparing'
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
  loopSection: ReactNode;
  loopState: LoopState;
  playlistSection: ReactNode;
  playlistState: PlaylistState;
  selectedView: SavedRehearsalLibraryVisibleSections extends never
    ? never
    : 'files' | 'tracks' | 'loops' | 'playlists';
  savedSourceTitle: string;
  searchState: SearchState;
  visibleSections: SavedRehearsalLibraryVisibleSections;
  onOpenPlaylistTagEditor: (playlistId: string) => void;
  onOpenLoopTagEditor: (
    loop: SavedRehearsalLibrarySectionProps['savedLoops'][number],
  ) => void;
  onOpenSourceTagEditor: (
    source: SavedRehearsalLibrarySectionProps['savedLibrarySources'][number],
  ) => void;
  trackPlaylistMenu: TrackPlaylistMenuState;
};
