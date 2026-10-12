import { View } from 'react-native';

import { LibrarySelectionServicesProvider } from '../../selection/library-selection-services';
import { SavedTrackPlaylistMenuSurface } from '../../playlists/components/saved-track-playlist-menu-surface';
import { resolveHasActiveLibraryFilters } from '../../search/utils/saved-library-search-view-model';
import { SavedRehearsalLibraryBrowseContent } from './browse-content';
import { buildSavedRehearsalLibraryDetailSectionElements } from './detail-section-elements';
import { SavedRehearsalLibrarySearchShell } from './search-shell';
import { SavedRehearsalLibraryStatusCards } from './status-cards';
import { savedRehearsalLibrarySectionStyles as styles } from './styles';
import { SavedRehearsalLibraryTagEditorSheet } from './tag-editor-sheet';
import type { SavedRehearsalLibrarySectionProps } from './types';
import { useSelectionServicesValue } from './use-selection-services-value';
import { useSavedRehearsalLibrarySectionOrchestration } from './use-saved-rehearsal-library-section-orchestration';

export const SavedRehearsalLibrarySection = ({
  activePlayableItem,
  activePlaylistSession,
  authorization,
  canMutateLibrary,
  canMutateLoops,
  canMutatePlaylists,
  closeTagDetailRequestId,
  createPlaylist,
  deletePlaylist,
  getCurrentScrollOffsetY,
  isDestinationActive = true,
  isPlaybackPreparing,
  isPlaylistCreateDialogVisible = false,
  isPlaylistsLoading,
  isSavedLibraryLoading,
  isSavedLoopsLoading,
  libraryFiles,
  openLoopBuilderForSource,
  onBrowseCreateDockChange,
  onDetailPlaybackChange,
  onDetailSearchActionsChange,
  onPlaylistSelectionHandlerChange,
  onShowLibraryFilesSuccessFeedback,
  originalLocationActions,
  pendingLoopBuilderSourceId,
  pendingLoopId,
  pendingPlaylistId,
  pendingSourceId,
  playbackIssue,
  playbackState,
  playlistIssue,
  queuePlayableItemNext,
  queuePlayableItemUpNext,
  queuePlayableItemsNext,
  queuePlayableItemsUpNext,
  removeLoop,
  removeSource,
  removeSourceWithoutConfirmation,
  requestedLoopEditId,
  requestedLoopEditRequestId,
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
    requestedLoopEditId,
    requestedLoopEditRequestId,
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
        pendingLoopBuilderSourceId,
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

  const selectionServices = useSelectionServicesValue({
    activePlayableItem,
    createPlaylist,
    isDestinationActive,
    libraryFiles,
    onShowLibraryFilesSuccessFeedback,
    queuePlayableItemsNext,
    queuePlayableItemsUpNext,
    savedLibrarySources,
    savedLoops,
    savedPlaylists,
    updatePlaylist,
  });

  return (
    <LibrarySelectionServicesProvider value={selectionServices}>
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
            authorization={authorization}
            canMutateLibrary={canMutateLibrary}
            canMutateLoops={canMutateLoops}
            canMutatePlaylists={canMutatePlaylists}
            canQueueAsNext={activePlayableItem !== null}
            libraryFiles={libraryFiles}
            isLoopMutating={isLoopMutating}
            isPlaybackPreparing={isPlaybackPreparing}
            isPlaylistMutating={isPlaylistMutating}
            isSavedLibraryMutating={isSavedLibraryMutating}
            loopSection={loopSection}
            loopState={loopState}
            openLoopBuilderForSource={openLoopBuilderForSource}
            originalLocationActions={originalLocationActions}
            pendingLoopBuilderSourceId={pendingLoopBuilderSourceId}
            pendingSourceId={pendingSourceId}
            playbackIssue={playbackIssue}
            playbackState={playbackState}
            playlistSection={playlistSection}
            playlistState={playlistState}
            queuePlayableItemNext={queuePlayableItemNext}
            queuePlayableItemUpNext={queuePlayableItemUpNext}
            removeLoop={removeLoop}
            removeSource={removeSource}
            removeSourceWithoutConfirmation={removeSourceWithoutConfirmation}
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
            onOpenFolderTagEditor={tagEditor.openFolderTagEditor}
            onOpenLoopTagEditor={tagEditor.openLoopTagEditor}
            onOpenPlaylistTagEditor={tagEditor.openPlaylistTagEditor}
            onPlaylistRenameVisibilityChange={
              setIsFilesPlaylistRenameDialogVisible
            }
            onOpenSourceTagEditor={tagEditor.openSourceTagEditor}
            onSelectTag={tagDetailState.openTagDetail}
            onShowLibraryFilesSuccessFeedback={
              onShowLibraryFilesSuccessFeedback
            }
            toggleActivePlayback={toggleActivePlayback}
            toggleItemQueuePlayback={toggleItemQueuePlayback}
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
    </LibrarySelectionServicesProvider>
  );
};
