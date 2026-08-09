import { View } from 'react-native';

import { SavedTrackPlaylistMenuSurface } from '../../playlists/components/saved-track-playlist-menu-surface';
import { resolveSavedRehearsalLibraryVisibleSections } from '../../saved-rehearsal-library/detail-mode';
import { SavedRehearsalLibraryBrowseContent } from './browse-content';
import { shouldRenderSavedLibraryBrowseContent } from './browse-content-model';
import {
  SavedRehearsalLibraryLoopSectionContent,
  SavedRehearsalLibraryPlaylistSectionContent,
} from './detail-sections';
import { useLoopSaveWithFilesLocation } from './library-files-loop-save';
import { SavedRehearsalLibrarySearchShell } from './search-shell';
import { SavedRehearsalLibraryStatusCards } from './status-cards';
import { savedRehearsalLibrarySectionStyles as styles } from './styles';
import { SavedRehearsalLibraryTagEditorSheet } from './tag-editor-sheet';
import type { SavedRehearsalLibrarySectionProps } from './types';
import { usePlaylistFilesAddItems } from './use-playlist-files-add-items';
import { useSavedRehearsalLibrarySectionEffects } from './use-saved-rehearsal-library-section-effects';
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
  libraryFilesSuccessFeedback,
  openLoopBuilderForSource,
  onDismissLibraryFilesSuccessFeedback,
  onBrowseCreateDockChange,
  onOpenLibraryFilesSuccessFeedbackFolder,
  onPlaylistSelectionHandlerChange,
  onShowLibraryFilesSuccessFeedback,
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
  useSavedRehearsalLibrarySectionEffects({
    detailMode,
    isSearchPanelVisible,
    onBrowseCreateDockChange,
    onPlaylistSelectionHandlerChange,
    savedLibrarySources,
    savedLoops,
    savedPlaylists,
    selectedView,
    setSelectedPlaylistId: playlistState.setSelectedPlaylistId,
    syncActivePlaylistContext,
  });
  const showSearchResults =
    isSearchPanelVisible && searchState.isLibrarySearchMode;
  const savedSourceTitle = showSearchResults
    ? `Matching saved rehearsal tracks (${searchState.visibleSavedLibrarySources.length})`
    : `Saved rehearsal tracks (${savedLibrarySources.length})`;
  const visibleSections =
    resolveSavedRehearsalLibraryVisibleSections(selectedView);
  const saveLoopForVisibleContext = useLoopSaveWithFilesLocation({
    detailMode,
    isEditingLoop: loopState.selectedLoopEdit !== null,
    isSearchPanelVisible,
    libraryFiles,
    onShowFilesSuccessFeedback: onShowLibraryFilesSuccessFeedback,
    saveLoop,
    selectedView,
  });
  const {
    handleClosePlaylistDetail,
    handleDoneAddingFilesPlaylistItems,
    handleOpenFilesAddItems,
  } = usePlaylistFilesAddItems({
    clearLibrarySearch: searchState.clearLibrarySearch,
    libraryFiles,
    playlistState,
    setSelectedView,
  });
  const loopSection = (
    <SavedRehearsalLibraryLoopSectionContent
      activePlayableItem={activePlayableItem}
      canMutateLoops={canMutateLoops}
      canMutatePlaylists={canMutatePlaylists}
      canQueueAsNext={activePlayableItem !== null}
      isPlaybackPreparing={isPlaybackPreparing}
      isPlaylistMutating={isPlaylistMutating}
      isSavedLoopsLoading={isSavedLoopsLoading}
      isTrackLoopDetailVisible={detailMode === 'track-loop-detail'}
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
  const playlistSection = (
    <SavedRehearsalLibraryPlaylistSectionContent
      activePlaylistSession={activePlaylistSession}
      canMutatePlaylists={canMutatePlaylists}
      createPlaylist={createPlaylist}
      deletePlaylist={deletePlaylist}
      getCurrentScrollOffsetY={getCurrentScrollOffsetY}
      isPlaylistDetailMode={detailMode === 'playlist-detail'}
      isPlaylistsLoading={isPlaylistsLoading}
      isPlaybackPreparing={isPlaybackPreparing}
      onClosePlaylistDetail={handleClosePlaylistDetail}
      onOpenFilesAddItems={handleOpenFilesAddItems}
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
      showBrowseHeader={selectedView !== 'playlists'}
      toggleActivePlayback={toggleActivePlayback}
      togglePlaylistPlayback={togglePlaylistPlayback}
      updatePlaylist={updatePlaylist}
    />
  );
  const shouldRenderBrowseContent = shouldRenderSavedLibraryBrowseContent({
    detailMode,
    isSearchPanelVisible,
    isSearchResultsVisible: showSearchResults,
    selectedView,
  });

  return (
    <View style={styles.savedLibrarySection}>
      <SavedRehearsalLibrarySearchShell
        currentFilesFolderName={
          libraryFiles.explorer?.currentFolder.name ?? null
        }
        handleFilterActionPress={searchPanel.handleFilterActionPress}
        handleSearchActionPress={searchPanel.handleSearchActionPress}
        onSelectView={setSelectedView}
        searchPanelVisibility={searchPanel.searchPanelVisibility}
        searchState={searchState}
        selectedView={selectedView}
      />
      <SavedRehearsalLibraryStatusCards
        isSavedLibraryLoading={isSavedLibraryLoading}
        isSearchPanelVisible={isSearchPanelVisible}
        savedSourceCount={savedLibrarySources.length}
        savedLibraryStatusCopy={savedLibraryStatusCopy}
        savedTrackPlaybackStatusCopy={savedTrackPlaybackStatusCopy}
      />
      {shouldRenderBrowseContent ? (
        <SavedRehearsalLibraryBrowseContent
          activePlayableItem={activePlayableItem}
          canMutateLibrary={canMutateLibrary}
          canMutateLoops={canMutateLoops}
          canMutatePlaylists={canMutatePlaylists}
          canQueueAsNext={activePlayableItem !== null}
          libraryFiles={libraryFiles}
          isLoopMutating={isLoopMutating}
          isPlaybackPreparing={isPlaybackPreparing}
          isPlaylistMutating={isPlaylistMutating}
          isSavedLibraryMutating={isSavedLibraryMutating}
          libraryFilesSuccessFeedback={libraryFilesSuccessFeedback}
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
          onDoneAddingFilesPlaylistItems={handleDoneAddingFilesPlaylistItems}
          onOpenFilesAddItemsForPlaylist={handleOpenFilesAddItems}
          onDismissLibraryFilesSuccessFeedback={
            onDismissLibraryFilesSuccessFeedback
          }
          onOpenLibraryFilesSuccessFeedbackFolder={
            onOpenLibraryFilesSuccessFeedbackFolder
          }
          onOpenLoopTagEditor={tagEditor.openLoopTagEditor}
          onOpenPlaylistTagEditor={tagEditor.openPlaylistTagEditor}
          onOpenSourceTagEditor={tagEditor.openSourceTagEditor}
          onShowLibraryFilesSuccessFeedback={onShowLibraryFilesSuccessFeedback}
          togglePlaylistPlayback={togglePlaylistPlayback}
          togglePlayableItemPlayback={togglePlayableItemPlayback}
          toggleSourcePlayback={toggleSourcePlayback}
          trackPlaylistMenu={trackPlaylistMenu}
        />
      ) : detailMode === 'playlist-detail' ? (
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
