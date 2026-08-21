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
import { useSavedRehearsalLibraryTagDetailState } from './use-saved-rehearsal-library-tag-detail-state';
import { useSavedRehearsalLibraryTagEditor } from './use-saved-rehearsal-library-tag-editor';
import { useSavedRehearsalLibraryTrackPlaylistMenu } from './use-saved-rehearsal-library-track-playlist-menu';
import { resolveIsViewSwitcherLocked } from './view-switcher-lock-model';

type UseSavedRehearsalLibrarySectionStateParams = Pick<
  SavedRehearsalLibrarySectionProps,
  | 'activePlaylistSession'
  | 'canMutateLoops'
  | 'createPlaylist'
  | 'deletePlaylist'
  | 'isPlaybackPreparing'
  | 'isPlaylistCreateDialogVisible'
  | 'libraryFiles'
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
  isPlaylistCreateDialogVisible = false,
  libraryFiles,
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
  const [
    isFilesPlaylistRenameDialogVisible,
    setIsFilesPlaylistRenameDialogVisible,
  ] = useState(false);
  const [
    isPlaylistDetailRenameDialogVisible,
    setIsPlaylistDetailRenameDialogVisible,
  ] = useState(false);
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
  const tagDetailState = useSavedRehearsalLibraryTagDetailState();
  const tagEditor = useSavedRehearsalLibraryTagEditor({
    saveFolderTags: libraryFiles.saveFolderTags,
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
    isTagDetailVisible: tagDetailState.isTagDetailVisible,
    selectedLoopViewSourceId: loopState.selectedLoopViewSourceId,
  });
  const isViewSwitcherLocked = resolveIsViewSwitcherLocked({
    isDetailViewOpen: detailMode !== 'browse',
    isFilesPlaylistRenameOpen: isFilesPlaylistRenameDialogVisible,
    isLoopBuilderOpen: selectedTrack !== null,
    isPlaylistCardRenameOpen: playlistState.cardRenamePlaylistId !== null,
    isPlaylistCreateDialogOpen: isPlaylistCreateDialogVisible,
    isPlaylistDetailRenameOpen: isPlaylistDetailRenameDialogVisible,
    isTagEditorOpen: tagEditor.isTagEditorVisible,
  });

  return {
    detailMode,
    isLoopMutating,
    isPlaylistMutating,
    isSavedLibraryMutating,
    isSavedTrackPlaybackLoading,
    isSearchPanelVisible,
    isViewSwitcherLocked,
    loopState,
    playlistState,
    searchPanel,
    searchState,
    selectedView,
    setIsFilesPlaylistRenameDialogVisible,
    setIsPlaylistDetailRenameDialogVisible,
    setSelectedView,
    tagDetailState,
    tagEditor,
    trackPlaylistMenu,
  };
};
