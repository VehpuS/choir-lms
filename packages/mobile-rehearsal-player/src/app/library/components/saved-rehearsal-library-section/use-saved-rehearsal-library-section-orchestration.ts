import { aggregateRehearsalLibraryTags } from '@org/audio-library-runtime';
import { useMemo } from 'react';

import { resolveSavedRehearsalLibraryVisibleSections } from '../../saved-rehearsal-library/detail-mode';
import { shouldRenderSavedLibraryBrowseContent } from './browse-content-model';
import { useLoopSaveWithFilesLocation } from './library-files-loop-save';
import type { SavedRehearsalLibrarySectionProps } from './types';
import { usePlaylistFilesAddItems } from './use-playlist-files-add-items';
import { useSavedRehearsalLibrarySectionEffects } from './use-saved-rehearsal-library-section-effects';
import { useSavedRehearsalLibrarySectionState } from './use-saved-rehearsal-library-section-state';

type UseSavedRehearsalLibrarySectionOrchestrationOptions = Pick<
  SavedRehearsalLibrarySectionProps,
  | 'activePlaylistSession'
  | 'canMutateLoops'
  | 'closeTagDetailRequestId'
  | 'createPlaylist'
  | 'deletePlaylist'
  | 'isPlaybackPreparing'
  | 'isPlaylistCreateDialogVisible'
  | 'libraryFiles'
  | 'onBrowseCreateDockChange'
  | 'onPlaylistSelectionHandlerChange'
  | 'onShowLibraryFilesSuccessFeedback'
  | 'openLoopBuilderForSource'
  | 'pendingLoopBuilderSourceId'
  | 'pendingLoopId'
  | 'pendingPlaylistId'
  | 'pendingSourceId'
  | 'playbackState'
  | 'playlistIssue'
  | 'requestedTag'
  | 'requestedTagRequestId'
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
  | 'syncActivePlaylistContext'
  | 'togglePlaylistPlayback'
  | 'updatePlaylist'
>;

// Consolidates every non-rendering concern for SavedRehearsalLibrarySection
// (composed state, side effects, the two derived-callback hooks, and the
// small render-gating computations) into one hook, so the shell component
// only needs to call this once, build its section JSX, and render.
export const useSavedRehearsalLibrarySectionOrchestration = ({
  activePlaylistSession,
  canMutateLoops,
  closeTagDetailRequestId,
  createPlaylist,
  deletePlaylist,
  isPlaybackPreparing,
  isPlaylistCreateDialogVisible,
  libraryFiles,
  onBrowseCreateDockChange,
  onPlaylistSelectionHandlerChange,
  onShowLibraryFilesSuccessFeedback,
  openLoopBuilderForSource,
  pendingLoopBuilderSourceId,
  pendingLoopId,
  pendingPlaylistId,
  pendingSourceId,
  playbackState,
  playlistIssue,
  requestedTag,
  requestedTagRequestId,
  saveLoop,
  saveSource,
  savedLibrarySources,
  savedLoops,
  savedPlaylists,
  searchPanel,
  searchState,
  selectedTrack,
  selectedView,
  setSelectedLoopSourceId,
  setSelectedView,
  syncActivePlaylistContext,
  togglePlaylistPlayback,
  updatePlaylist,
}: UseSavedRehearsalLibrarySectionOrchestrationOptions) => {
  const sectionState = useSavedRehearsalLibrarySectionState({
    activePlaylistSession,
    canMutateLoops,
    createPlaylist,
    deletePlaylist,
    isPlaybackPreparing,
    isPlaylistCreateDialogVisible,
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
    searchPanel,
    searchState,
    selectedTrack,
    selectedView,
    setSelectedLoopSourceId,
    setSelectedView,
    togglePlaylistPlayback,
    updatePlaylist,
  });

  useSavedRehearsalLibrarySectionEffects({
    closeTagDetail: sectionState.tagDetailState.closeTagDetail,
    closeTagDetailRequestId,
    detailMode: sectionState.detailMode,
    isSearchPanelVisible: sectionState.isSearchPanelVisible,
    onBrowseCreateDockChange,
    onPlaylistSelectionHandlerChange,
    openTagDetail: sectionState.tagDetailState.openTagDetail,
    requestedTag,
    requestedTagRequestId,
    savedLibrarySources,
    savedLoops,
    savedPlaylists,
    selectedView: sectionState.selectedView,
    setSelectedPlaylistId: sectionState.playlistState.setSelectedPlaylistId,
    syncActivePlaylistContext,
  });

  const showResults =
    sectionState.isSearchPanelVisible &&
    sectionState.searchState.isLibrarySearchMode;
  const savedSourceTitle = showResults
    ? `Matching saved rehearsal tracks (${sectionState.searchState.visibleSavedLibrarySources.length})`
    : `Saved rehearsal tracks (${savedLibrarySources.length})`;
  const visibleSections = resolveSavedRehearsalLibraryVisibleSections(
    sectionState.selectedView,
  );
  const saveLoopForVisibleContext = useLoopSaveWithFilesLocation({
    detailMode: sectionState.detailMode,
    isEditingLoop: sectionState.loopState.selectedLoopEdit !== null,
    isSearchPanelVisible: sectionState.isSearchPanelVisible,
    libraryFiles,
    onShowFilesSuccessFeedback: onShowLibraryFilesSuccessFeedback,
    saveLoop,
    selectedView: sectionState.selectedView,
  });
  const {
    handleClosePlaylistDetail,
    handleDoneAddingFilesPlaylistItems,
    handleOpenFilesAddItems,
  } = usePlaylistFilesAddItems({
    clearLibrarySearch: sectionState.searchState.clearLibrarySearch,
    libraryFiles,
    playlistState: sectionState.playlistState,
    setSelectedView: sectionState.setSelectedView,
  });
  const shouldRenderBrowseContent = shouldRenderSavedLibraryBrowseContent({
    detailMode: sectionState.detailMode,
    isSearchPanelVisible: sectionState.isSearchPanelVisible,
    isSearchResultsVisible: showResults,
    selectedView: sectionState.selectedView,
  });
  const availableTagUsage = useMemo(() => {
    return aggregateRehearsalLibraryTags({
      entityCollections: {
        loops: savedLoops,
        playlists: savedPlaylists,
        sources: savedLibrarySources,
      },
      folders: libraryFiles.folders,
    });
  }, [libraryFiles.folders, savedLibrarySources, savedLoops, savedPlaylists]);

  return {
    ...sectionState,
    availableTagUsage,
    handleClosePlaylistDetail,
    handleDoneAddingFilesPlaylistItems,
    handleOpenFilesAddItems,
    saveLoopForVisibleContext,
    savedSourceTitle,
    shouldRenderBrowseContent,
    visibleSections,
  };
};
