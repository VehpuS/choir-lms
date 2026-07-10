import { useState } from 'react';

import { isSavedTrackPlaybackBusy } from '../../playback/utils/saved-track-playback-view-model';
import {
  resolveSavedRehearsalLibraryDetailMode,
  type SavedRehearsalLibraryView,
} from '../../saved-rehearsal-library/detail-mode';
import type { SavedRehearsalLibrarySectionProps } from './types';
import { useSavedRehearsalLibraryLoopState } from './use-saved-rehearsal-library-loop-state';
import { useSavedRehearsalLibraryPlaylistState } from './use-saved-rehearsal-library-playlist-state';
import { useSavedRehearsalLibrarySearch } from './use-saved-rehearsal-library-search';
import { useSavedRehearsalLibrarySearchPanel } from './use-saved-rehearsal-library-search-panel';
import { useSavedRehearsalLibraryTagEditor } from './use-saved-rehearsal-library-tag-editor';
import { useSavedRehearsalLibraryTrackPlaylistMenu } from './use-saved-rehearsal-library-track-playlist-menu';

type UseSavedRehearsalLibrarySectionStateParams = Pick<
  SavedRehearsalLibrarySectionProps,
  | 'activePlaylistSession'
  | 'canMutateLoops'
  | 'createPlaylist'
  | 'deletePlaylist'
  | 'isPlaybackPreparing'
  | 'pendingLoopBuilderSourceId'
  | 'pendingLoopId'
  | 'pendingPlaylistId'
  | 'pendingSourceId'
  | 'playbackState'
  | 'playlistIssue'
  | 'saveLoop'
  | 'saveSource'
  | 'savedLibrarySources'
  | 'savedLoops'
  | 'savedPlaylists'
  | 'searchPanel'
  | 'searchState'
  | 'selectedTrack'
  | 'selectedView'
  | 'setSelectedLoopSourceId'
  | 'setSelectedView'
  | 'updatePlaylist'
  | 'togglePlaylistPlayback'
  | 'openLoopBuilderForSource'
>;

export const useSavedRehearsalLibrarySectionState = ({
  activePlaylistSession,
  canMutateLoops,
  createPlaylist,
  deletePlaylist,
  isPlaybackPreparing,
  openLoopBuilderForSource,
  pendingLoopBuilderSourceId,
  pendingLoopId,
  pendingPlaylistId,
  pendingSourceId,
  playbackState,
  playlistIssue,
  saveLoop,
  saveSource,
  savedLibrarySources,
  savedLoops,
  savedPlaylists,
  searchPanel: externalSearchPanel,
  searchState: externalSearchState,
  selectedTrack,
  selectedView: externalSelectedView,
  setSelectedLoopSourceId,
  setSelectedView: externalSetSelectedView,
  togglePlaylistPlayback,
  updatePlaylist,
}: UseSavedRehearsalLibrarySectionStateParams) => {
  const [internalSelectedView, setInternalSelectedView] =
    useState<SavedRehearsalLibraryView>('files');
  const internalSearchState = useSavedRehearsalLibrarySearch({
    savedLibrarySources,
    savedLoops,
    savedPlaylists,
  });
  const searchState = externalSearchState ?? internalSearchState;
  const playlistState = useSavedRehearsalLibraryPlaylistState({
    deletePlaylist,
    playlistIssue,
    savedPlaylists,
    updatePlaylist,
  });
  const internalSearchPanel = useSavedRehearsalLibrarySearchPanel({
    searchState,
  });
  const searchPanel = externalSearchPanel ?? internalSearchPanel;
  const selectedView = externalSelectedView ?? internalSelectedView;
  const setSelectedView = externalSetSelectedView ?? setInternalSelectedView;
  const trackPlaylistMenu = useSavedRehearsalLibraryTrackPlaylistMenu({
    createPlaylist,
    savedLibrarySources,
    savedLoops,
    setSelectedPlaylistId: playlistState.setSelectedPlaylistId,
    updatePlaylist,
  });
  const tagEditor = useSavedRehearsalLibraryTagEditor({
    saveLoop,
    saveSource,
    savedPlaylists,
    updatePlaylist,
  });
  const isSavedLibraryMutating = pendingSourceId !== null;
  const isSavedTrackPlaybackLoading = isSavedTrackPlaybackBusy({
    isPreparing: isPlaybackPreparing,
    playbackState,
  });
  const isSearchPanelVisible = searchPanel.isSearchPanelVisible;
  const isPlaylistMutating = pendingPlaylistId !== null;
  const isLoopMutating = pendingLoopId !== null;
  const loopState = useSavedRehearsalLibraryLoopState({
    activePlaylistSession,
    canMutateLoops,
    isLibrarySearchMode: searchState.isLibrarySearchMode,
    isLoopMutating,
    isPlaybackPreparing,
    openLoopBuilderForSource,
    pendingLoopBuilderSourceId,
    playbackState,
    savedLibrarySources,
    savedLoops,
    selectedTrack,
    setSelectedLoopSourceId,
    togglePlaylistPlayback,
  });
  const detailMode = resolveSavedRehearsalLibraryDetailMode({
    isPlaylistDetailVisible: playlistState.isPlaylistDetailVisible,
    selectedLoopViewSourceId: loopState.selectedLoopViewSourceId,
  });

  return {
    detailMode,
    isLoopMutating,
    isPlaylistMutating,
    isSavedLibraryMutating,
    isSavedTrackPlaybackLoading,
    isSearchPanelVisible,
    loopState,
    playlistState,
    searchPanel,
    searchState,
    selectedView,
    setSelectedView,
    tagEditor,
    trackPlaylistMenu,
  };
};
