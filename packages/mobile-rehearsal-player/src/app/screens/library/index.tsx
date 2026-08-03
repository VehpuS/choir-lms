import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SavedRehearsalLibrarySection } from '../../library/components/saved-rehearsal-library-section';
import type { LibraryFilesSuccessFeedback } from '../../library/components/saved-rehearsal-library-section/library-files-success-feedback';
import { SavedRehearsalLibraryHeader } from '../../library/components/saved-rehearsal-library-section/search-shell';
import type { LibraryBrowseCreateDockMode } from '../../library/components/saved-rehearsal-library-section/types';
import { useSavedRehearsalLibrarySearch } from '../../library/components/saved-rehearsal-library-section/use-saved-rehearsal-library-search';
import { useSavedRehearsalLibrarySearchPanel } from '../../library/components/saved-rehearsal-library-section/use-saved-rehearsal-library-search-panel';
import { LoopPreviewPlaybackContext } from '../../library/loops/components/loop-preview-playback-context';
import type { SavedRehearsalLibraryView } from '../../library/saved-rehearsal-library/detail-mode';
import { appTheme } from '../../utils/theme';
import { LibraryFilesCreateControls } from './library-files-create-controls';
import { LibraryPlaylistCreateControls } from './library-playlist-create-controls';
import type { LibraryScreenProps } from './library-screen-types';
import { useLibraryScreenScrollCoordination } from './use-library-screen-scroll-coordination';

export const LibraryScreen = ({
  authorization,
  libraryController,
  onRequestAddDestination,
  playback,
}: LibraryScreenProps) => {
  const [selectedView, setSelectedView] =
    useState<SavedRehearsalLibraryView>('files');
  const [browseCreateDockMode, setBrowseCreateDockMode] =
    useState<LibraryBrowseCreateDockMode>(null);
  const [libraryFilesSuccessFeedback, setLibraryFilesSuccessFeedback] =
    useState<LibraryFilesSuccessFeedback | null>(null);
  const [isSessionMenuVisible, setIsSessionMenuVisible] = useState(false);
  const playlistSelectionHandlerRef = useRef<
    ((playlistId: string) => void) | null
  >(null);
  const scrollCoordination = useLibraryScreenScrollCoordination();
  const searchState = useSavedRehearsalLibrarySearch({
    savedLibrarySources: libraryController.savedLibrary.savedLibrarySources,
    savedLoops: libraryController.savedLibrary.savedLoops,
    savedPlaylists: libraryController.playlists.savedPlaylists,
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
  return (
    <View style={styles.screen}>
      {isSessionMenuVisible ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setIsSessionMenuVisible(false);
          }}
          style={styles.menuBackdrop}
        />
      ) : null}
      <SavedRehearsalLibraryHeader
        authorization={authorization}
        handleFilterActionPress={searchPanel.handleFilterActionPress}
        handleSearchActionPress={searchPanel.handleSearchActionPress}
        isSessionMenuVisible={isSessionMenuVisible}
        onCloseSessionMenu={() => {
          setIsSessionMenuVisible(false);
        }}
        onToggleSessionMenu={() => {
          setIsSessionMenuVisible((currentValue) => !currentValue);
        }}
        searchPanelVisibility={searchPanel.searchPanelVisibility}
        searchState={searchState}
        style={styles.destinationHeader}
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
            onBrowseCreateDockChange={setBrowseCreateDockMode}
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
        onRequestAddDestination={onRequestAddDestination}
        onShowSuccessFeedback={showLibraryFilesSuccessFeedback}
        playlistIssue={libraryController.playlists.issue}
      />
      <LibraryPlaylistCreateControls
        canMutatePlaylists={libraryController.playlists.canMutatePlaylists}
        createPlaylist={libraryController.playlists.createPlaylist}
        isVisible={browseCreateDockMode === 'playlists'}
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
  destinationHeader: {
    marginTop: 12,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
    backgroundColor: appTheme.colors.pageBackground,
  },
});
