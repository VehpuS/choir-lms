import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { SavedTrackPlaylistMenuSurface } from '../../playlists/components/saved-track-playlist-menu-surface';
import { resolveSavedRehearsalLibraryVisibleSections } from '../../saved-rehearsal-library/detail-mode';
import { SavedRehearsalLibraryBrowseContent } from './browse-content';
import {
  SavedRehearsalLibraryLoopSectionContent,
  SavedRehearsalLibraryPlaylistSectionContent,
} from './detail-sections';
import { SavedRehearsalLibrarySearchShell } from './search-shell';
import { useLoopSaveWithFilesLocation } from './library-files-loop-save';
import { SavedRehearsalLibraryStatusCards } from './status-cards';
import { savedRehearsalLibrarySectionStyles as styles } from './styles';
import { SavedRehearsalLibraryTagEditorSheet } from './tag-editor-sheet';
import type { SavedRehearsalLibrarySectionProps } from './types';
import { useSavedRehearsalLibrarySectionState } from './use-saved-rehearsal-library-section-state';

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
  const {
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
  } = useSavedRehearsalLibrarySectionState({
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
  const visibleSections = resolveSavedRehearsalLibraryVisibleSections(selectedView);
  const saveLoopForVisibleContext = useLoopSaveWithFilesLocation({ detailMode, isEditingLoop: loopState.selectedLoopEdit !== null, isSearchPanelVisible, libraryFiles, saveLoop, selectedView });
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
      saveLoop={saveLoopForVisibleContext}
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
      <SavedRehearsalLibraryStatusCards
        isSavedLibraryLoading={isSavedLibraryLoading}
        isSavedTrackPlaybackLoading={isSavedTrackPlaybackLoading}
        savedLibraryStatusCopy={savedLibraryStatusCopy}
        savedTrackPlaybackStatusCopy={savedTrackPlaybackStatusCopy}
        shouldShowPlaybackStatus={shouldShowPlaybackStatus}
        shouldShowSavedLibraryStatus={shouldShowSavedLibraryStatus}
      />
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
      <SavedRehearsalLibraryTagEditorSheet tagEditor={tagEditor} />
    </View>
  );
};
