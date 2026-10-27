import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SavedRehearsalLibrarySection } from '../../library/components/saved-rehearsal-library-section';
import type { LibraryBrowseCreateDockMode } from '../../library/components/saved-rehearsal-library-section/types';
import { useSavedRehearsalLibrarySearch } from '../../library/components/saved-rehearsal-library-section/use-saved-rehearsal-library-search';
import { useSavedRehearsalLibrarySearchPanel } from '../../library/components/saved-rehearsal-library-section/use-saved-rehearsal-library-search-panel';
import { useIsOfflineFilesOpen } from '../offline-files/offline-files-navigation-store';
import { useIsBulkActionBarPinned } from '../../library/selection/use-pinned-bulk-action-bar';
import { LoopPreviewPlaybackContext } from '../../library/loops/components/loop-preview-playback-context';
import type { PlaylistDetailHeaderPlaybackAction } from '../../library/playlists/utils/saved-playlist-playback-view-model';
import type { SavedRehearsalLibraryView } from '../../library/saved-rehearsal-library/detail-mode';
import type { TagDetailHeaderSearchActions } from '../../library/tags/hooks/use-tag-detail-header-search-actions';
import { appTheme } from '../../utils/theme';
import { LibraryFilesCreateControls } from './library-files-create-controls';
import { resolveLibraryHeaderSearchProps } from './library-header-search-props';
import { LibraryPlaylistCreateControls } from './library-playlist-create-controls';
import { LibrarySuccessToast } from './library-success-toast';
import { LibraryScreenHeader } from './library-screen-header';
import type { LibraryScreenProps } from './library-screen-types';
import { useLibraryFilesSessionRestoration } from './use-library-files-session-restoration';
import { useLibraryScreenScrollCoordination } from './use-library-screen-scroll-coordination';
import { useLibrarySuccessFeedback } from './use-library-success-feedback';
import { useRequestedLibraryView } from './use-requested-library-view';
import { scrollGutterStyles } from '../../components/scroll-gutter';

export const LibraryScreen = ({
  authorization,
  closeTagDetailRequestId,
  isActive,
  libraryController,
  onRequestAddDestination,
  playback,
  requestedLoopEditId,
  requestedLoopEditRequestId,
  requestedTag,
  requestedTagRequestId,
  requestedView,
  requestedViewRequestId,
}: LibraryScreenProps) => {
  const [selectedView, setSelectedView] =
    useState<SavedRehearsalLibraryView>('files');

  useRequestedLibraryView({
    requestedView,
    requestedViewRequestId,
    setSelectedView,
  });
  const [browseCreateDockMode, setBrowseCreateDockMode] =
    useState<LibraryBrowseCreateDockMode>(null);
  const { feedback: librarySuccessFeedback, openFeedbackFolder } =
    useLibrarySuccessFeedback({
      isActive,
      openFolder: libraryController.savedLibrary.files.openFolder,
      selectedView,
      setSelectedView,
    });
  const [isSessionMenuVisible, setIsSessionMenuVisible] = useState(false);
  const [playlistDetailPlayback, setPlaylistDetailPlayback] =
    useState<PlaylistDetailHeaderPlaybackAction | null>(null);
  const [detailSearchActions, setDetailSearchActions] =
    useState<TagDetailHeaderSearchActions | null>(null);
  const [
    isFilesPlaylistCreateDialogVisible,
    setIsFilesPlaylistCreateDialogVisible,
  ] = useState(false);
  const [
    isPlaylistsDockCreateDialogVisible,
    setIsPlaylistsDockCreateDialogVisible,
  ] = useState(false);
  const playlistSelectionHandlerRef = useRef<
    ((playlistId: string) => void) | null
  >(null);
  // The create dock gives way while a selection's bulk-action bar is pinned.
  const isBulkBarPinned = useIsBulkActionBarPinned();
  const isOfflineFilesOpen = useIsOfflineFilesOpen();
  const scrollCoordination = useLibraryScreenScrollCoordination();
  const searchState = useSavedRehearsalLibrarySearch({
    savedLibrarySources: libraryController.savedLibrary.savedLibrarySources,
    savedLoops: libraryController.savedLibrary.savedLoops,
    savedPlaylists: libraryController.playlists.savedPlaylists,
    selectedView,
  });
  useLibraryFilesSessionRestoration({
    activeSearchQuery: searchState.activeLibrarySearchQuery,
    currentFilesFolderId:
      libraryController.savedLibrary.files.explorer?.currentFolder.id ?? null,
    currentView: selectedView,
    filesSearchScope: searchState.filesSearchScope,
    filesSortDirection: searchState.filesSortDirection,
    filesSortMode: searchState.filesSortMode,
    getCurrentScrollOffsetY: scrollCoordination.getCurrentScrollOffsetY,
    librarySearchQuery: searchState.librarySearchQuery,
    openFilesFolder: libraryController.savedLibrary.files.openFolder,
    restoreLibraryFilesSearchState: searchState.restoreLibraryFilesSearchState,
    restoreScrollOffsetY: scrollCoordination.restoreScrollOffsetY,
  });
  const searchPanel = useSavedRehearsalLibrarySearchPanel({
    searchState,
  });
  const handlePlaylistCreated = useCallback((playlistId: string) => {
    playlistSelectionHandlerRef.current?.(playlistId);
  }, []);
  const headerSearchProps = resolveLibraryHeaderSearchProps({
    detailSearchActions,
    playlistDetailPlayback,
    searchPanel,
    searchState,
  });
  return (
    <View style={styles.screen}>
      <LibraryScreenHeader
        authorization={authorization}
        detailSearchActions={detailSearchActions}
        headerSearchProps={headerSearchProps}
        isSessionMenuVisible={isSessionMenuVisible}
        onCloseSessionMenu={() => {
          setIsSessionMenuVisible(false);
        }}
        onToggleSessionMenu={() => {
          setIsSessionMenuVisible((currentValue) => !currentValue);
        }}
        playlistDetailPlayback={playlistDetailPlayback}
      />
      <ScrollView
        ref={scrollCoordination.scrollViewRef}
        contentContainerStyle={[
          styles.content,
          scrollGutterStyles.content,
          browseCreateDockMode !== null && !isBulkBarPinned
            ? styles.contentWithCreateDock
            : null,
        ]}
        onContentSizeChange={scrollCoordination.handleContentSizeChange}
        onLayout={scrollCoordination.handleLayout}
        onScroll={scrollCoordination.handleScroll}
        scrollEnabled={!scrollCoordination.isPlaylistReorderDragActive}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={[styles.scrollView, scrollGutterStyles.scrollView]}
      >
        <LoopPreviewPlaybackContext.Provider
          value={{
            playbackPositionSeconds: playback.progress.position,
            seekActivePlaybackToPosition: playback.seekActivePlaybackToPosition,
            syncActivePreviewRange: playback.syncActivePreviewRange,
          }}
        >
          <SavedRehearsalLibrarySection
            activePlayableItem={playback.activePlayableItem}
            activePlaylistSession={playback.activePlaylistSession}
            authorization={authorization}
            canMutateLibrary={libraryController.savedLibrary.canMutateLibrary}
            canMutateLoops={libraryController.savedLibrary.canMutateLoops}
            canMutatePlaylists={libraryController.playlists.canMutatePlaylists}
            createPlaylist={libraryController.playlists.createPlaylist}
            deletePlaylist={libraryController.playlists.deletePlaylist}
            getCurrentScrollOffsetY={scrollCoordination.getCurrentScrollOffsetY}
            // A selection ends when the offline files view opens over it: both
            // want the one pinned bulk-action bar (task 1.13).
            isDestinationActive={isActive && !isOfflineFilesOpen}
            isPlaybackPreparing={playback.isPreparing}
            isPlaylistCreateDialogVisible={
              isFilesPlaylistCreateDialogVisible ||
              isPlaylistsDockCreateDialogVisible
            }
            isPlaylistsLoading={libraryController.playlists.isLoading}
            isSavedLibraryLoading={libraryController.savedLibrary.isLoading}
            isSavedLoopsLoading={
              libraryController.savedLibrary.isSavedLoopsLoading
            }
            libraryFiles={libraryController.savedLibrary.files}
            openLoopBuilderForSource={
              libraryController.savedLibrary.openLoopBuilderForSource
            }
            closeTagDetailRequestId={closeTagDetailRequestId}
            onBrowseCreateDockChange={setBrowseCreateDockMode}
            onDetailPlaybackChange={setPlaylistDetailPlayback}
            onDetailSearchActionsChange={setDetailSearchActions}
            onPlaylistSelectionHandlerChange={(handler) => {
              playlistSelectionHandlerRef.current = handler;
            }}
            onShowLibraryFilesSuccessFeedback={librarySuccessFeedback.show}
            originalLocationActions={libraryController.originalLocation}
            pendingLoopBuilderSourceId={
              libraryController.savedLibrary.pendingLoopBuilderSourceId
            }
            pendingLoopId={libraryController.savedLibrary.pendingLoopId}
            pendingPlaylistId={libraryController.playlists.pendingPlaylistId}
            pendingSourceId={libraryController.savedLibrary.pendingSourceId}
            playbackIssue={playback.issue}
            playbackState={playback.playbackState}
            playlistIssue={libraryController.playlists.issue}
            queuePlayableItemNext={playback.queuePlayableItemNext}
            queuePlayableItemUpNext={playback.queuePlayableItemUpNext}
            queuePlayableItemsNext={playback.queuePlayableItemsNext}
            queuePlayableItemsUpNext={playback.queuePlayableItemsUpNext}
            removeLoop={libraryController.savedLibrary.removeLoop}
            removeSource={libraryController.savedLibrary.removeSource}
            removeSourceWithoutConfirmation={
              libraryController.savedLibrary.removeSourceWithoutConfirmation
            }
            requestedLoopEditId={requestedLoopEditId}
            requestedLoopEditRequestId={requestedLoopEditRequestId}
            requestedTag={requestedTag}
            requestedTagRequestId={requestedTagRequestId}
            savedLibraryIssue={libraryController.savedLibrary.savedLibraryIssue}
            savedLibrarySources={
              libraryController.savedLibrary.savedLibrarySources
            }
            savedLibraryStatusCopy={
              libraryController.savedLibrary.savedLibraryStatusCopy
            }
            savedLoopIssue={libraryController.savedLibrary.savedLoopIssue}
            savedLoops={libraryController.savedLibrary.savedLoops}
            savedPlaylists={libraryController.playlists.savedPlaylists}
            savedTrackPlaybackStatusCopy={
              libraryController.savedLibrary.savedTrackPlaybackStatusCopy
            }
            saveLoop={libraryController.savedLibrary.saveLoop}
            saveSource={libraryController.savedLibrary.saveSource}
            searchPanel={searchPanel}
            searchState={searchState}
            selectedTrack={libraryController.savedLibrary.selectedLoopTrack}
            selectedView={selectedView}
            setIsPlaylistReorderDragActive={
              scrollCoordination.setPlaylistReorderDragActive
            }
            setPlaylistReorderDragMoveY={
              scrollCoordination.setPlaylistReorderDragMoveY
            }
            setSelectedLoopSourceId={
              libraryController.savedLibrary.setSelectedLoopSourceId
            }
            setSelectedView={setSelectedView}
            syncActivePlaylistContext={playback.syncActivePlaylistContext}
            toggleActivePlayback={playback.toggleActivePlayback}
            toggleItemQueuePlayback={playback.toggleItemQueuePlayback}
            togglePlayableItemPlayback={playback.togglePlayableItemPlayback}
            togglePlaylistPlayback={playback.togglePlaylistPlayback}
            toggleSourcePlayback={playback.toggleSourcePlayback}
            updatePlaylist={libraryController.playlists.updatePlaylist}
          />
        </LoopPreviewPlaybackContext.Provider>
      </ScrollView>
      <LibrarySuccessToast
        feedback={librarySuccessFeedback.acknowledgment}
        onBlur={librarySuccessFeedback.onBlur}
        onDismiss={librarySuccessFeedback.dismiss}
        onFocus={librarySuccessFeedback.onFocus}
        onOpenFolder={openFeedbackFolder}
      />
      <LibraryFilesCreateControls
        createPlaylist={libraryController.playlists.createPlaylist}
        files={libraryController.savedLibrary.files}
        isVisible={browseCreateDockMode === 'files' && !isBulkBarPinned}
        onPlaylistCreateDialogVisibilityChange={
          setIsFilesPlaylistCreateDialogVisible
        }
        onRequestAddDestination={onRequestAddDestination}
        onShowSuccessFeedback={librarySuccessFeedback.show}
        playlistIssue={libraryController.playlists.issue}
      />
      <LibraryPlaylistCreateControls
        canMutatePlaylists={libraryController.playlists.canMutatePlaylists}
        createPlaylist={libraryController.playlists.createPlaylist}
        isVisible={browseCreateDockMode === 'playlists' && !isBulkBarPinned}
        onPlaylistCreateDialogVisibilityChange={
          setIsPlaylistsDockCreateDialogVisible
        }
        onSelectPlaylist={handlePlaylistCreated}
        playlistIssue={libraryController.playlists.issue}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: appTheme.colors.pageBackground,
  },
  content: {
    gap: 14,
    paddingTop: 12,
    paddingBottom: 20,
  },
  contentWithCreateDock: {
    paddingBottom: 188,
  },
  scrollView: {
    flex: 1,
    backgroundColor: appTheme.colors.pageBackground,
  },
});
