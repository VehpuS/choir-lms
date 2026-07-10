import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { TagEditorSheet } from '../../components/tag-editor-sheet';
import { DriveLibraryStatusCard } from '../../drive/components/drive-library-status-card';
import { isSavedTrackPlaybackBusy } from '../../playback/utils/saved-track-playback-view-model';
import { SavedTrackPlaylistMenuSurface } from '../../playlists/components/saved-track-playlist-menu-surface';
import {
  resolveSavedRehearsalLibraryDetailMode,
  resolveSavedRehearsalLibraryVisibleSections,
  type SavedRehearsalLibraryView,
} from '../../saved-rehearsal-library/detail-mode';
import { SavedRehearsalLibraryBrowseContent } from './browse-content';
import {
  SavedRehearsalLibraryLoopSectionContent,
  SavedRehearsalLibraryPlaylistSectionContent,
} from './detail-sections';
import { SavedRehearsalLibrarySearchShell } from './search-shell';
import { savedRehearsalLibrarySectionStyles as styles } from './styles';
import type { SavedRehearsalLibrarySectionProps } from './types';
import { useSavedRehearsalLibraryLoopState } from './use-saved-rehearsal-library-loop-state';
import { useSavedRehearsalLibraryPlaylistState } from './use-saved-rehearsal-library-playlist-state';
import { useSavedRehearsalLibrarySearch } from './use-saved-rehearsal-library-search';
import { useSavedRehearsalLibrarySearchPanel } from './use-saved-rehearsal-library-search-panel';
import { useSavedRehearsalLibraryTagEditor } from './use-saved-rehearsal-library-tag-editor';
import { useSavedRehearsalLibraryTrackPlaylistMenu } from './use-saved-rehearsal-library-track-playlist-menu';

export const SavedRehearsalLibrarySection = ({
  activePlayableItem,
  activePlaylistSession,
  canMutateLibrary,
  canMutateLoops,
  canMutatePlaylists,
  createPlaylist,
  deletePlaylist,
  getCurrentScrollOffsetY,
  isPlaybackPreparing,
  isPlaylistsLoading,
  isSavedLibraryLoading,
  isSavedLoopsLoading,
  libraryFiles,
  openLoopBuilderForSource,
  onFilesExplorerVisibilityChange,
  pendingLoopBuilderSourceId,
  pendingLoopId,
  pendingPlaylistId,
  pendingSourceId,
  playbackIssue,
  playbackState,
  playlistIssue,
  queuePlayableItemNext,
  queuePlayableItemUpNext,
  removeLoop,
  removeSource,
  savedLibraryIssue,
  savedLibrarySources,
  savedLibraryStatusCopy,
  savedLoopIssue,
  savedLoops,
  savedPlaylists,
  savedTrackPlaybackStatusCopy,
  saveLoop,
  saveSource,
  searchPanel: externalSearchPanel,
  searchState: externalSearchState,
  selectedTrack,
  selectedView: externalSelectedView,
  setIsPlaylistReorderDragActive,
  setPlaylistReorderDragMoveY,
  setSelectedLoopSourceId,
  setSelectedView: externalSetSelectedView,
  syncActivePlaylistContext,
  toggleActivePlayback,
  togglePlayableItemPlayback,
  togglePlaylistPlayback,
  toggleSourcePlayback,
  updatePlaylist,
}: SavedRehearsalLibrarySectionProps) => {
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
  useEffect(() => {
    syncActivePlaylistContext({
      loops: savedLoops,
      playlists: savedPlaylists,
      sources: savedLibrarySources,
    });
  }, [
    savedLibrarySources,
    savedLoops,
    savedPlaylists,
    syncActivePlaylistContext,
  ]);
  const detailMode = resolveSavedRehearsalLibraryDetailMode({
    isPlaylistDetailVisible: playlistState.isPlaylistDetailVisible,
    selectedLoopViewSourceId: loopState.selectedLoopViewSourceId,
  });
  const isTrackLoopDetailVisible = detailMode === 'track-loop-detail';
  const isPlaylistDetailMode = detailMode === 'playlist-detail';
  const canQueueAsNext = activePlayableItem !== null;
  const shouldShowSavedLibraryStatus =
    !isSearchPanelVisible &&
    (isSavedLibraryLoading || savedLibraryStatusCopy.tone !== 'ready');
  const shouldShowPlaybackStatus =
    !isSearchPanelVisible &&
    savedTrackPlaybackStatusCopy !== null &&
    (isSavedTrackPlaybackLoading ||
      savedTrackPlaybackStatusCopy.tone !== 'ready');
  const shouldShowSearchResults =
    isSearchPanelVisible && searchState.isLibrarySearchMode;
  const savedSourceTitle = shouldShowSearchResults
    ? `Matching saved rehearsal tracks (${searchState.visibleSavedLibrarySources.length})`
    : `Saved rehearsal tracks (${savedLibrarySources.length})`;
  const visibleSections =
    resolveSavedRehearsalLibraryVisibleSections(selectedView);
  const loopSection = (
    <SavedRehearsalLibraryLoopSectionContent
      activePlayableItem={activePlayableItem}
      canMutateLoops={canMutateLoops}
      canMutatePlaylists={canMutatePlaylists}
      canQueueAsNext={canQueueAsNext}
      isPlaybackPreparing={isPlaybackPreparing}
      isPlaylistMutating={isPlaylistMutating}
      isSavedLoopsLoading={isSavedLoopsLoading}
      isTrackLoopDetailVisible={isTrackLoopDetailVisible}
      loopState={loopState}
      onOpenLoopTagEditor={tagEditor.openLoopTagEditor}
      openLoopPlaylistSelector={trackPlaylistMenu.openLoopPlaylistSelector}
      pendingLoopId={pendingLoopId}
      playbackIssue={playbackIssue}
      playbackState={playbackState}
      queuePlayableItemNext={queuePlayableItemNext}
      queuePlayableItemUpNext={queuePlayableItemUpNext}
      removeLoop={removeLoop}
      savedLibrarySources={savedLibrarySources}
      savedLoopIssue={savedLoopIssue}
      savedLoops={searchState.visibleSavedLoops}
      saveLoop={saveLoop}
      searchHighlightQuery={searchState.activeLibrarySearchQuery}
      selectedTrack={selectedTrack}
      toggleActivePlayback={toggleActivePlayback}
      togglePlayableItemPlayback={togglePlayableItemPlayback}
    />
  );
  const handleClosePlaylistDetail = useCallback(() => {
    const detailOrigin = playlistState.playlistDetailOrigin;

    playlistState.closePlaylistDetail();

    if (!detailOrigin) {
      return;
    }

    setSelectedView(detailOrigin.view);

    if (detailOrigin.view === 'files' && detailOrigin.filesFolderId) {
      libraryFiles.goToFolder(detailOrigin.filesFolderId);
    }
  }, [libraryFiles, playlistState, setSelectedView]);
  const playlistSection = (
    <SavedRehearsalLibraryPlaylistSectionContent
      activePlaylistSession={activePlaylistSession}
      canMutatePlaylists={canMutatePlaylists}
      createPlaylist={createPlaylist}
      deletePlaylist={deletePlaylist}
      getCurrentScrollOffsetY={getCurrentScrollOffsetY}
      isPlaylistDetailMode={isPlaylistDetailMode}
      isPlaylistsLoading={isPlaylistsLoading}
      isPlaybackPreparing={isPlaybackPreparing}
      onClosePlaylistDetail={handleClosePlaylistDetail}
      onOpenPlaylistTagEditor={tagEditor.openPlaylistTagEditor}
      pendingPlaylistId={pendingPlaylistId}
      playbackState={playbackState}
      playlistIssue={playlistIssue}
      playlistState={playlistState}
      savedLibrarySources={savedLibrarySources}
      savedLoops={savedLoops}
      savedPlaylists={savedPlaylists}
      setIsPlaylistReorderDragActive={setIsPlaylistReorderDragActive}
      setPlaylistReorderDragMoveY={setPlaylistReorderDragMoveY}
      toggleActivePlayback={toggleActivePlayback}
      togglePlaylistPlayback={togglePlaylistPlayback}
      updatePlaylist={updatePlaylist}
    />
  );
  const shouldRenderBrowseContent = isSearchPanelVisible
    ? shouldShowSearchResults
    : detailMode === 'browse';

  useEffect(() => {
    onFilesExplorerVisibilityChange?.(
      selectedView === 'files' &&
        detailMode === 'browse' &&
        !isSearchPanelVisible,
    );
  }, [
    detailMode,
    isSearchPanelVisible,
    onFilesExplorerVisibilityChange,
    selectedView,
  ]);

  return (
    <View style={styles.savedLibrarySection}>
      <SavedRehearsalLibrarySearchShell
        handleFilterActionPress={searchPanel.handleFilterActionPress}
        handleSearchActionPress={searchPanel.handleSearchActionPress}
        onSelectView={setSelectedView}
        searchPanelVisibility={searchPanel.searchPanelVisibility}
        searchState={searchState}
        selectedView={selectedView}
      />
      {shouldShowSavedLibraryStatus ? (
        <DriveLibraryStatusCard
          isLoading={isSavedLibraryLoading}
          loadingLabel="Refreshing saved rehearsal tracks…"
          statusCopy={savedLibraryStatusCopy}
        />
      ) : null}
      {savedTrackPlaybackStatusCopy && shouldShowPlaybackStatus ? (
        <DriveLibraryStatusCard
          isLoading={isSavedTrackPlaybackLoading}
          loadingLabel="Starting track playback…"
          statusCopy={savedTrackPlaybackStatusCopy}
        />
      ) : null}
      {shouldRenderBrowseContent ? (
        <SavedRehearsalLibraryBrowseContent
          activePlayableItem={activePlayableItem}
          canMutateLibrary={canMutateLibrary}
          canMutateLoops={canMutateLoops}
          canMutatePlaylists={canMutatePlaylists}
          canQueueAsNext={canQueueAsNext}
          libraryFiles={libraryFiles}
          isLoopMutating={isLoopMutating}
          isPlaybackPreparing={isPlaybackPreparing}
          isPlaylistMutating={isPlaylistMutating}
          isSavedLibraryMutating={isSavedLibraryMutating}
          loopSection={loopSection}
          loopState={loopState}
          openLoopBuilderForSource={openLoopBuilderForSource}
          pendingLoopBuilderSourceId={pendingLoopBuilderSourceId}
          pendingSourceId={pendingSourceId}
          playbackIssue={playbackIssue}
          playbackState={playbackState}
          playlistSection={playlistSection}
          playlistState={playlistState}
          queuePlayableItemNext={queuePlayableItemNext}
          queuePlayableItemUpNext={queuePlayableItemUpNext}
          removeSource={removeSource}
          savedLibraryIssue={savedLibraryIssue}
          savedLibrarySources={savedLibrarySources}
          savedLoops={savedLoops}
          savedPlaylists={savedPlaylists}
          selectedTrack={selectedTrack}
          selectedView={selectedView}
          savedSourceTitle={savedSourceTitle}
          searchState={searchState}
          visibleSections={visibleSections}
          onOpenLoopTagEditor={tagEditor.openLoopTagEditor}
          onOpenPlaylistTagEditor={tagEditor.openPlaylistTagEditor}
          onOpenSourceTagEditor={tagEditor.openSourceTagEditor}
          togglePlaylistPlayback={togglePlaylistPlayback}
          togglePlayableItemPlayback={togglePlayableItemPlayback}
          toggleSourcePlayback={toggleSourcePlayback}
          trackPlaylistMenu={trackPlaylistMenu}
        />
      ) : isPlaylistDetailMode ? (
        playlistSection
      ) : (
        loopSection
      )}
      <SavedTrackPlaylistMenuSurface
        {...trackPlaylistMenu.menuSurfaceProps}
        isMutating={isPlaylistMutating}
        playlists={savedPlaylists}
      />
      <TagEditorSheet
        isSaving={tagEditor.isTagEditorSaving}
        isVisible={tagEditor.isTagEditorVisible}
        onClose={tagEditor.closeTagEditor}
        onSave={(tags) => {
          void tagEditor.saveTagEdits(tags);
        }}
        tags={tagEditor.tags}
        title={tagEditor.title}
      />
    </View>
  );
};
