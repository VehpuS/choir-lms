import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SavedRehearsalLibrarySection } from '../../library/components/saved-rehearsal-library-section';
import type { LibraryFilesSuccessFeedback } from '../../library/components/saved-rehearsal-library-section/library-files-success-feedback';
import type { LibraryBrowseCreateDockMode } from '../../library/components/saved-rehearsal-library-section/types';
import { useSavedRehearsalLibrarySearch } from '../../library/components/saved-rehearsal-library-section/use-saved-rehearsal-library-search';
import { useSavedRehearsalLibrarySearchPanel } from '../../library/components/saved-rehearsal-library-section/use-saved-rehearsal-library-search-panel';
import { LoopPreviewPlaybackContext } from '../../library/loops/components/loop-preview-playback-context';
import type { PlaylistDetailHeaderPlaybackAction } from '../../library/playlists/utils/saved-playlist-playback-view-model';
import type { SavedRehearsalLibraryView } from '../../library/saved-rehearsal-library/detail-mode';
import type { TagDetailHeaderSearchActions } from '../../library/tags/hooks/use-tag-detail-header-search-actions';
import { appTheme } from '../../utils/theme';
import { LibraryFilesCreateControls } from './library-files-create-controls';
import { resolveLibraryHeaderSearchProps } from './library-header-search-props';
import { LibraryPlaylistCreateControls } from './library-playlist-create-controls';
import { LibraryScreenHeader } from './library-screen-header';
import type { LibraryScreenProps } from './library-screen-types';
import { useLibraryFilesSessionRestoration } from './use-library-files-session-restoration';
import { useLibraryScreenScrollCoordination } from './use-library-screen-scroll-coordination';

export const LibraryScreen = ({
  authorization,
  closeTagDetailRequestId,
  libraryController,
  onRequestAddDestination,
  playback,
  requestedTag,
  requestedTagRequestId,
  requestedView,
  requestedViewRequestId,
}: LibraryScreenProps) => {
  const [selectedView, setSelectedView] =
    useState<SavedRehearsalLibraryView>('files');

  useEffect(() => {
    if (!requestedView || requestedViewRequestId === undefined) {
      return;
    }

    setSelectedView(requestedView);
  }, [requestedView, requestedViewRequestId]);
  const [browseCreateDockMode, setBrowseCreateDockMode] =
    useState<LibraryBrowseCreateDockMode>(null);
  const [libraryFilesSuccessFeedback, setLibraryFilesSuccessFeedback] =
    useState<LibraryFilesSuccessFeedback | null>(null);
  const [isSessionMenuVisible, setIsSessionMenuVisible] = useState(false);
  const [playlistDetailPlayback, setPlaylistDetailPlayback] =
    useState<PlaylistDetailHeaderPlaybackAction | null>(null);
  const [detailSearchActions, setDetailSearchActions] =
    useState<TagDetailHeaderSearchActions | null>(null);
  const [isFilesPlaylistCreateDialogVisible, setIsFilesPlaylistCreateDialogVisible] =
    useState(false);
  const [
    isPlaylistsDockCreateDialogVisible,
    setIsPlaylistsDockCreateDialogVisible,
  ] = useState(false);
  const playlistSelectionHandlerRef = useRef<
    ((playlistId: string) => void) | null
  >(null);
  const scrollCoordination = useLibraryScreenScrollCoordination();
  const searchState = useSavedRehearsalLibrarySearch({
    savedLibrarySources: libraryController.savedLibrary.savedLibrarySources,
    savedLoops: libraryController.savedLibrary.savedLoops,
    savedPlaylists: libraryController.playlists.savedPlaylists,
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
  const showLibraryFilesSuccessFeedback = useCallback(
    (feedback: LibraryFilesSuccessFeedback) => {
      setLibraryFilesSuccessFeedback(feedback);
    },
    [],
  );
  const dismissLibraryFilesSuccessFeedback = useCallback(() => {
    setLibraryFilesSuccessFeedback(null);
  }, []);
  const handlePlaylistCreated = useCallback((playlistId: string) => {
    playlistSelectionHandlerRef.current?.(playlistId);
  }, []);
  const openLibraryFilesSuccessFeedbackFolder = useCallback(
    (folderId: string) => {
      if (!folderId) {
        return;
      }

      setSelectedView('files');
      libraryController.savedLibrary.files.openFolder(folderId);
      setLibraryFilesSuccessFeedback(null);
    },
    [libraryController.savedLibrary.files],
  );
  const headerSearchProps = resolveLibraryHeaderSearchProps({
    detailSearchActions,
    playlistDetailPlayback,
    searchPanel,
    searchState,
    selectedView,
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
          browseCreateDockMode !== null ? styles.contentWithCreateDock : null,
        ]}
        onContentSizeChange={scrollCoordination.handleContentSizeChange}
        onLayout={scrollCoordination.handleLayout}
        onScroll={scrollCoordination.handleScroll}
        scrollEnabled={!scrollCoordination.isPlaylistReorderDragActive}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <LoopPreviewPlaybackContext.Provider
          value={{
            playbackPositionSeconds: playback.progress.position,
            seekActivePlaybackToPosition: playback.seekActivePlaybackToPosition,
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
            libraryFilesSuccessFeedback={libraryFilesSuccessFeedback}
            openLoopBuilderForSource={
              libraryController.savedLibrary.openLoopBuilderForSource
            }
            onDismissLibraryFilesSuccessFeedback={
              dismissLibraryFilesSuccessFeedback
            }
            closeTagDetailRequestId={closeTagDetailRequestId}
            onBrowseCreateDockChange={setBrowseCreateDockMode}
            onDetailPlaybackChange={setPlaylistDetailPlayback}
            onDetailSearchActionsChange={setDetailSearchActions}
            onOpenLibraryFilesSuccessFeedbackFolder={
              openLibraryFilesSuccessFeedbackFolder
            }
            onPlaylistSelectionHandlerChange={(handler) => {
              playlistSelectionHandlerRef.current = handler;
            }}
            onShowLibraryFilesSuccessFeedback={showLibraryFilesSuccessFeedback}
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
            removeLoop={libraryController.savedLibrary.removeLoop}
            removeSource={libraryController.savedLibrary.removeSource}
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
      <LibraryFilesCreateControls
        createPlaylist={libraryController.playlists.createPlaylist}
        files={libraryController.savedLibrary.files}
        isVisible={browseCreateDockMode === 'files'}
        onPlaylistCreateDialogVisibilityChange={
          setIsFilesPlaylistCreateDialogVisible
        }
        onRequestAddDestination={onRequestAddDestination}
        onShowSuccessFeedback={showLibraryFilesSuccessFeedback}
        playlistIssue={libraryController.playlists.issue}
      />
      <LibraryPlaylistCreateControls
        canMutatePlaylists={libraryController.playlists.canMutatePlaylists}
        createPlaylist={libraryController.playlists.createPlaylist}
        isVisible={browseCreateDockMode === 'playlists'}
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
