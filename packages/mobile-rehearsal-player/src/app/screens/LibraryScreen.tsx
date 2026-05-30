import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import type { useSavedTrackPlayback } from '../library/hooks/use-saved-track-playback';

import { SavedRehearsalLibrarySection } from '../library/components/SavedRehearsalLibrarySection';
import type { useRehearsalLibraryScreenController } from '../library/hooks/use-rehearsal-library-screen-controller';
import { resolveSavedPlaylistDetailEdgeAutoscrollDelta } from '../library/utils/saved-playlist-detail-view-model';
import { appTheme } from '../utils/theme';

type SavedTrackPlaybackController = Pick<
  ReturnType<typeof useSavedTrackPlayback>,
  | 'activePlaylistSession'
  | 'activePlayableItem'
  | 'isPreparing'
  | 'issue'
  | 'playbackState'
  | 'progress'
  | 'syncActivePlaylistContext'
  | 'queuePlayableItemUpNext'
  | 'queuePlayableItemNext'
  | 'togglePlayableItemPlayback'
  | 'togglePlaylistPlayback'
  | 'toggleSourcePlayback'
>;

type LibraryScreenProps = {
  libraryController: ReturnType<typeof useRehearsalLibraryScreenController>;
  playback: SavedTrackPlaybackController;
};

type MeasurableScrollView = ScrollView & {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

export const LibraryScreen = ({
  libraryController,
  playback,
}: LibraryScreenProps) => {
  const [isPlaylistReorderDragActive, setIsPlaylistReorderDragActive] =
    useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrollOffsetYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const viewportTopInWindowRef = useRef(0);
  const viewportHeightRef = useRef(0);

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
      style={styles.screen}
    >
      <SavedRehearsalLibrarySection
        activePlayableItem={playback.activePlayableItem}
        activePlaylistSession={playback.activePlaylistSession}
        canMutateLibrary={libraryController.savedLibrary.canMutateLibrary}
        canMutateLoops={libraryController.savedLibrary.canMutateLoops}
        isPlaybackPreparing={playback.isPreparing}
        isSavedLibraryLoading={libraryController.savedLibrary.isLoading}
        isSavedLoopsLoading={libraryController.savedLibrary.isSavedLoopsLoading}
        pendingSourceId={libraryController.savedLibrary.pendingSourceId}
        pendingLoopId={libraryController.savedLibrary.pendingLoopId}
        playbackIssue={playback.issue}
        playbackState={playback.playbackState}
        removeLoop={libraryController.savedLibrary.removeLoop}
        removeSource={libraryController.savedLibrary.removeSource}
        savedLibraryIssue={libraryController.savedLibrary.savedLibraryIssue}
        savedLibrarySources={libraryController.savedLibrary.savedLibrarySources}
        savedLoopIssue={libraryController.savedLibrary.savedLoopIssue}
        savedLoops={libraryController.savedLibrary.savedLoops}
        savedLibraryStatusCopy={
          libraryController.savedLibrary.savedLibraryStatusCopy
        }
        saveLoop={libraryController.savedLibrary.saveLoop}
        getCurrentScrollOffsetY={() => {
          return scrollOffsetYRef.current;
        }}
        savedTrackPlaybackStatusCopy={
          libraryController.savedLibrary.savedTrackPlaybackStatusCopy
        }
        syncActivePlaylistContext={playback.syncActivePlaylistContext}
        openLoopBuilderForSource={
          libraryController.savedLibrary.openLoopBuilderForSource
        }
        pendingLoopBuilderSourceId={
          libraryController.savedLibrary.pendingLoopBuilderSourceId
        }
        selectedTrack={libraryController.savedLibrary.selectedLoopTrack}
        setSelectedLoopSourceId={
          libraryController.savedLibrary.setSelectedLoopSourceId
        }
        setIsPlaylistReorderDragActive={setPlaylistReorderDragActive}
        setPlaylistReorderDragMoveY={setPlaylistReorderDragMoveY}
        queuePlayableItemNext={playback.queuePlayableItemNext}
        queuePlayableItemUpNext={playback.queuePlayableItemUpNext}
        togglePlayableItemPlayback={playback.togglePlayableItemPlayback}
        togglePlaylistPlayback={playback.togglePlaylistPlayback}
        toggleSourcePlayback={playback.toggleSourcePlayback}
      />
    </ScrollView>
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
});
