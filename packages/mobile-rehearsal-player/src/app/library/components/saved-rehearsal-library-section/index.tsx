import { View } from 'react-native';

import { LibrarySelectionServicesProvider } from '../../selection/library-selection-services';
import { SavedTrackPlaylistMenuSurface } from '../../playlists/components/saved-track-playlist-menu-surface';
import { resolveHasActiveLibraryFilters } from '../../search/utils/saved-library-search-view-model';
import { SavedRehearsalLibraryBrowseContent } from './browse-content';
import { buildSavedRehearsalLibraryDetailSectionElements } from './detail-section-elements';
import { useSavedItemRequestHandler } from '../saved-item-menu/use-saved-item-request-handler';
import { SavedRehearsalLibrarySearchShell } from './search-shell';
import { SavedRehearsalLibraryStatusCards } from './status-cards';
import { savedRehearsalLibrarySectionStyles as styles } from './styles';
import { SavedRehearsalLibraryTagEditorSheet } from './tag-editor-sheet';
import type { SavedRehearsalLibrarySectionProps } from './types';
import { useSelectionServicesValue } from './use-selection-services-value';
import { useSavedRehearsalLibrarySectionOrchestration } from './use-saved-rehearsal-library-section-orchestration';

export const SavedRehearsalLibrarySection = (
  props: SavedRehearsalLibrarySectionProps,
) => {
  const {
    activePlayableItem,
    activePlaylistSession,
    canMutateLoops,
    closeTagDetailRequestId,
    createPlaylist,
    deletePlaylist,
    isDestinationActive = true,
    isPlaybackPreparing,
    isPlaylistCreateDialogVisible = false,
    isSavedLibraryLoading,
    libraryFiles,
    openLoopBuilderForSource,
    onBrowseCreateDockChange,
    onPlaylistSelectionHandlerChange,
    onShowLibraryFilesSuccessFeedback,
    pendingLoopBuilderSourceId,
    pendingLoopId,
    pendingPlaylistId,
    pendingSourceId,
    playbackState,
    playlistIssue,
    queuePlayableItemsNext,
    queuePlayableItemsUpNext,
    removeLoop,
    removeSource,
    requestedLoopEditId,
    requestedLoopEditRequestId,
    requestedTag,
    requestedTagRequestId,
    savedLibrarySources,
    savedLibraryStatusCopy,
    savedLoops,
    savedPlaylists,
    savedTrackPlaybackStatusCopy,
    saveLoop,
    saveSource,
    searchPanel: externalSearchPanel,
    searchState: externalSearchState,
    selectedTrack,
    selectedView: externalSelectedView,
    setSelectedLoopSourceId,
    setSelectedView: externalSetSelectedView,
    syncActivePlaylistContext,
    togglePlaylistPlayback,
    updatePlaylist,
  } = props;
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
  useSavedItemRequestHandler({
    openLoopEditor: loopState.openLoopEditor,
    openLoopPlaylistSelector: trackPlaylistMenu.openLoopPlaylistSelector,
    openLoopTagEditor: tagEditor.openLoopTagEditor,
    openSourcePlaylistSelector: trackPlaylistMenu.openSourcePlaylistSelector,
    openSourceTagEditor: tagEditor.openSourceTagEditor,
    openTrackLoopView: loopState.openTrackLoopView,
    removeLoop,
    removeSource,
    savedLibrarySources,
    savedLoops,
    setSelectedView,
  });
  const { loopSection, playlistSection, tagDetailSection } =
    buildSavedRehearsalLibraryDetailSectionElements({
      handleClosePlaylistDetail,
      handleOpenFilesAddItems,
      props,
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
            {...props}
            canQueueAsNext={activePlayableItem !== null}
            isLoopMutating={isLoopMutating}
            isPlaylistMutating={isPlaylistMutating}
            isSavedLibraryMutating={isSavedLibraryMutating}
            loopSection={loopSection}
            loopState={loopState}
            playlistSection={playlistSection}
            playlistState={playlistState}
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
            togglePlaylistPlayback={togglePlaylistPlayback}
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
