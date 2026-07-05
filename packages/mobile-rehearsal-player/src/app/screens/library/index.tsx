import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { DriveSessionMenuController } from '../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import { SavedRehearsalLibrarySection } from '../../library/components/saved-rehearsal-library-section';
import { SavedRehearsalLibraryHeader } from '../../library/components/saved-rehearsal-library-section/search-shell';
import { useSavedRehearsalLibrarySearch } from '../../library/components/saved-rehearsal-library-section/use-saved-rehearsal-library-search';
import { useSavedRehearsalLibrarySearchPanel } from '../../library/components/saved-rehearsal-library-section/use-saved-rehearsal-library-search-panel';
import { LoopPreviewPlaybackContext } from '../../library/loops/components/loop-preview-playback-context';
import type { useSavedTrackPlayback } from '../../library/playback/hooks/use-saved-track-playback';
import { resolveSavedPlaylistDetailEdgeAutoscrollDelta } from '../../library/playlists/utils/saved-playlist-detail-view-model';
import type { SavedRehearsalLibraryView } from '../../library/saved-rehearsal-library/detail-mode';
import type { useRehearsalLibraryController } from '../../library/saved-rehearsal-library/use-rehearsal-library-controller';
import { appTheme } from '../../utils/theme';

type SavedTrackPlaybackController = Pick<
  ReturnType<typeof useSavedTrackPlayback>,
  | 'activePlaylistSession'
  | 'activePlayableItem'
  | 'isPreparing'
  | 'issue'
  | 'playbackState'
  | 'progress'
  | 'queuePlayableItemNext'
  | 'queuePlayableItemUpNext'
  | 'seekActivePlaybackToPosition'
  | 'syncActivePlaylistContext'
  | 'toggleActivePlayback'
  | 'togglePlayableItemPlayback'
  | 'togglePlaylistPlayback'
  | 'toggleSourcePlayback'
>;

type LibraryScreenProps = {
  authorization: DriveSessionMenuController;
  libraryController: ReturnType<typeof useRehearsalLibraryController>;
  playback: SavedTrackPlaybackController;
};

type MeasurableScrollView = ScrollView & {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

export const LibraryScreen = ({
  authorization,
  libraryController,
  playback,
}: LibraryScreenProps) => {
  const [selectedView, setSelectedView] =
    useState<SavedRehearsalLibraryView>('files');
  const [isSessionMenuVisible, setIsSessionMenuVisible] = useState(false);
  const [isPlaylistReorderDragActive, setIsPlaylistReorderDragActive] =
    useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrollOffsetYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const viewportTopInWindowRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const searchState = useSavedRehearsalLibrarySearch({
    savedLibrarySources: libraryController.savedLibrary.savedLibrarySources,
    savedLoops: libraryController.savedLibrary.savedLoops,
    savedPlaylists: libraryController.playlists.savedPlaylists,
  });
  const searchPanel = useSavedRehearsalLibrarySearchPanel({
    searchState,
  });

  const refreshViewportBounds = useCallback(() => {
    const measurableScrollView =
      scrollViewRef.current as MeasurableScrollView | null;

    measurableScrollView?.measureInWindow((_x, y, _width, height) => {
      viewportTopInWindowRef.current = y;
      viewportHeightRef.current = height;
    });
  }, []);

  const setPlaylistReorderDragActive = useCallback(
    (isActive: boolean) => {
      if (isActive) {
        refreshViewportBounds();
      }

      setIsPlaylistReorderDragActive(isActive);
    },
    [refreshViewportBounds],
  );

  const setPlaylistReorderDragMoveY = useCallback(
    (moveY: number) => {
      if (!isPlaylistReorderDragActive) {
        return;
      }

      const viewportHeight = viewportHeightRef.current;
      const viewportTop = viewportTopInWindowRef.current;
      const moveYWithinViewport = moveY - viewportTop;

      if (viewportHeight <= 0) {
        return;
      }

      const scrollDelta = resolveSavedPlaylistDetailEdgeAutoscrollDelta({
        moveY: moveYWithinViewport,
        viewportHeight,
      });

      if (scrollDelta === 0) {
        return;
      }

      const maxOffset = Math.max(contentHeightRef.current - viewportHeight, 0);
      const nextOffset = Math.max(
        0,
        Math.min(scrollOffsetYRef.current + scrollDelta, maxOffset),
      );

      if (nextOffset === scrollOffsetYRef.current) {
        return;
      }

      scrollOffsetYRef.current = nextOffset;
      scrollViewRef.current?.scrollTo({
        y: nextOffset,
        animated: false,
      });
    },
    [isPlaylistReorderDragActive],
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
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        onContentSizeChange={(_, contentHeight) => {
          contentHeightRef.current = contentHeight;
        }}
        onLayout={(event) => {
          viewportHeightRef.current = event.nativeEvent.layout.height;
          refreshViewportBounds();
        }}
        onScroll={(event) => {
          scrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEnabled={!isPlaylistReorderDragActive}
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
            canMutateLibrary={libraryController.savedLibrary.canMutateLibrary}
            canMutateLoops={libraryController.savedLibrary.canMutateLoops}
            canMutatePlaylists={libraryController.playlists.canMutatePlaylists}
            createPlaylist={libraryController.playlists.createPlaylist}
            deletePlaylist={libraryController.playlists.deletePlaylist}
            getCurrentScrollOffsetY={() => {
              return scrollOffsetYRef.current;
            }}
            isPlaybackPreparing={playback.isPreparing}
            isPlaylistsLoading={libraryController.playlists.isLoading}
            isSavedLibraryLoading={libraryController.savedLibrary.isLoading}
            isSavedLoopsLoading={
              libraryController.savedLibrary.isSavedLoopsLoading
            }
            openLoopBuilderForSource={
              libraryController.savedLibrary.openLoopBuilderForSource
            }
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
            setIsPlaylistReorderDragActive={setPlaylistReorderDragActive}
            setPlaylistReorderDragMoveY={setPlaylistReorderDragMoveY}
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
