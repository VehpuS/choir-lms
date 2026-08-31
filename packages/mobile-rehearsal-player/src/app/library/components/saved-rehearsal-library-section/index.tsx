import { View } from 'react-native';

import { SavedTrackPlaylistMenuSurface } from '../../playlists/components/saved-track-playlist-menu-surface';
import { resolveHasActiveLibraryFilters } from '../../search/utils/saved-library-search-view-model';
import { SavedRehearsalLibraryBrowseContent } from './browse-content';
import { buildSavedRehearsalLibraryDetailSectionElements } from './detail-section-elements';
import { SavedRehearsalLibrarySearchShell } from './search-shell';
import { SavedRehearsalLibraryStatusCards } from './status-cards';
import { savedRehearsalLibrarySectionStyles as styles } from './styles';
import { SavedRehearsalLibraryTagEditorSheet } from './tag-editor-sheet';
import type { SavedRehearsalLibrarySectionProps } from './types';
import { useSavedRehearsalLibrarySectionOrchestration } from './use-saved-rehearsal-library-section-orchestration';

export const SavedRehearsalLibrarySection = ({
  activePlayableItem,
  activePlaylistSession,
  canMutateLibrary,
  canMutateLoops,
  canMutatePlaylists,
  closeTagDetailRequestId,
  createPlaylist,
  deletePlaylist,
  getCurrentScrollOffsetY,
  isPlaybackPreparing,
  isPlaylistCreateDialogVisible = false,
  isPlaylistsLoading,
  isSavedLibraryLoading,
  isSavedLoopsLoading,
  libraryFiles,
  libraryFilesSuccessFeedback,
  openLoopBuilderForSource,
  onBlurLibraryFilesSuccessFeedback,
  onDismissLibraryFilesSuccessFeedback,
  onFocusLibraryFilesSuccessFeedback,
  onBrowseCreateDockChange,
  onDetailPlaybackChange,
  onDetailSearchActionsChange,
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
  requestedTag,
  requestedTagRequestId,
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
  toggleItemQueuePlayback,
  togglePlayableItemPlayback,
  togglePlaylistPlayback,
  toggleSourcePlayback,
  updatePlaylist,
}: SavedRehearsalLibrarySectionProps) => {
  const {
    availableTagUsage,
    detailMode,
    handleClosePlaylistDetail,
    handleDoneAddingFilesPlaylistItems,
    handleOpenFilesAddItems,
    isLoopMutating,
    isPlaylistMutating,
    isSavedLibraryMutating,
    isSearchPanelVisible,
    isViewSwitcherLocked,
    loopState,
    playlistState,
    saveLoopForVisibleContext,
    savedSourceTitle,
    searchPanel,
    searchState,
    selectedView,
    setIsFilesPlaylistRenameDialogVisible,
    setIsPlaylistDetailRenameDialogVisible,
    setSelectedView,
    shouldRenderBrowseContent,
    tagDetailState,
    tagEditor,
    trackPlaylistMenu,
    visibleSections,
  } = useSavedRehearsalLibrarySectionOrchestration({
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
    searchPanel: externalSearchPanel,
    searchState: externalSearchState,
    selectedTrack,
    selectedView: externalSelectedView,
    setSelectedLoopSourceId,
    setSelectedView: externalSetSelectedView,
    syncActivePlaylistContext,
    togglePlaylistPlayback,
    updatePlaylist,
  });
  const { loopSection, playlistSection, tagDetailSection } =
    buildSavedRehearsalLibraryDetailSectionElements({
      handleClosePlaylistDetail,
      handleOpenFilesAddItems,
      props: {
        activePlayableItem,
        activePlaylistSession,
        canMutateLoops,
        canMutatePlaylists,
        createPlaylist,
        deletePlaylist,
        getCurrentScrollOffsetY,
        isPlaybackPreparing,
        isPlaylistsLoading,
        isSavedLoopsLoading,
        libraryFiles,
        onDetailPlaybackChange,
        onDetailSearchActionsChange,
        pendingLoopId,
        pendingPlaylistId,
        playbackIssue,
        playbackState,
        playlistIssue,
        queuePlayableItemNext,
        queuePlayableItemUpNext,
        removeLoop,
        savedLibrarySources,
        savedLoopIssue,
        savedLoops,
        savedPlaylists,
        selectedTrack,
        setIsPlaylistReorderDragActive,
        setPlaylistReorderDragMoveY,
        toggleActivePlayback,
        toggleItemQueuePlayback,
        togglePlayableItemPlayback,
        togglePlaylistPlayback,
        updatePlaylist,
      },
      saveLoopForVisibleContext,
      showLoopBrowseList: visibleSections.showLoopBrowseList,
      state: {
        detailMode,
        isPlaylistMutating,
        loopState,
        playlistState,
        searchState,
        selectedView,
        setIsPlaylistDetailRenameDialogVisible,
        setSelectedView,
        tagDetailState,
        tagEditor,
        trackPlaylistMenu,
      },
    });

  return (
    <View style={styles.savedLibrarySection}>
      <SavedRehearsalLibrarySearchShell
        currentFilesFolderName={
          libraryFiles.explorer?.currentFolder.name ?? null
        }
        handleFilterActionPress={searchPanel.handleFilterActionPress}
        handleSearchActionPress={searchPanel.handleSearchActionPress}
        hasActiveFilters={resolveHasActiveLibraryFilters(
          searchState.entityFilter,
          searchState.selectedTagFilters,
        )}
        isViewSwitcherLocked={isViewSwitcherLocked}
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
          onBlurLibraryFilesSuccessFeedback={onBlurLibraryFilesSuccessFeedback}
          onDismissLibraryFilesSuccessFeedback={
            onDismissLibraryFilesSuccessFeedback
          }
          onFocusLibraryFilesSuccessFeedback={
            onFocusLibraryFilesSuccessFeedback
          }
          onOpenLibraryFilesSuccessFeedbackFolder={
            onOpenLibraryFilesSuccessFeedbackFolder
          }
          onOpenFolderTagEditor={tagEditor.openFolderTagEditor}
          onOpenLoopTagEditor={tagEditor.openLoopTagEditor}
          onOpenPlaylistTagEditor={tagEditor.openPlaylistTagEditor}
          onPlaylistRenameVisibilityChange={
            setIsFilesPlaylistRenameDialogVisible
          }
          onOpenSourceTagEditor={tagEditor.openSourceTagEditor}
          onSelectTag={tagDetailState.openTagDetail}
          onShowLibraryFilesSuccessFeedback={onShowLibraryFilesSuccessFeedback}
          togglePlaylistPlayback={togglePlaylistPlayback}
          togglePlayableItemPlayback={togglePlayableItemPlayback}
          toggleSourcePlayback={toggleSourcePlayback}
          trackPlaylistMenu={trackPlaylistMenu}
        />
      ) : detailMode === 'playlist-detail' ? (
        playlistSection
      ) : detailMode === 'tag-detail' ? (
        tagDetailSection
      ) : (
        loopSection
      )}
      <SavedTrackPlaylistMenuSurface
        {...trackPlaylistMenu.menuSurfaceProps}
        isMutating={isPlaylistMutating}
        playlists={savedPlaylists}
      />
      <SavedRehearsalLibraryTagEditorSheet
        availableTagUsage={availableTagUsage}
        tagEditor={tagEditor}
      />
      {playlistState.confirmationDialog}
    </View>
  );
};
