import { ScrollView, StyleSheet } from 'react-native';
import type { useSavedTrackPlayback } from '../library/hooks/use-saved-track-playback';

import { SummaryCard } from '../components/SummaryCard';
import { SavedRehearsalLibrarySection } from '../library/components/SavedRehearsalLibrarySection';
import type { useRehearsalLibraryScreenController } from '../library/hooks/use-rehearsal-library-screen-controller';
import { appTheme } from '../utils/theme';
import { getLibraryScreenSummaryCopy } from './screen-copy';

type SavedTrackPlaybackController = Pick<
  ReturnType<typeof useSavedTrackPlayback>,
  | 'activePlayableItem'
  | 'isPreparing'
  | 'issue'
  | 'playbackState'
  | 'progress'
  | 'togglePlayableItemPlayback'
  | 'toggleSourcePlayback'
>;

type LibraryScreenProps = {
  libraryController: ReturnType<typeof useRehearsalLibraryScreenController>;
  playback: SavedTrackPlaybackController;
};

export const LibraryScreen = ({
  libraryController,
  playback,
}: LibraryScreenProps) => {
  const summaryCopy = getLibraryScreenSummaryCopy({
    savedTrackCount: libraryController.savedLibrary.trackCount,
  });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <SummaryCard
        body={summaryCopy.body}
        eyebrow="Your library"
        title={summaryCopy.title}
      />
      <SavedRehearsalLibrarySection
        activePlayableItem={playback.activePlayableItem}
        canMutateLibrary={libraryController.savedLibrary.canMutateLibrary}
        canMutateLoops={libraryController.savedLibrary.canMutateLoops}
        isPlaybackPreparing={playback.isPreparing}
        isSavedLibraryLoading={libraryController.savedLibrary.isLoading}
        isSavedLoopsLoading={libraryController.savedLibrary.isSavedLoopsLoading}
        pendingSourceId={libraryController.savedLibrary.pendingSourceId}
        pendingLoopId={libraryController.savedLibrary.pendingLoopId}
        playbackIssue={playback.issue}
        playbackState={playback.playbackState}
        positionSeconds={playback.progress.position}
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
        savedTrackPlaybackStatusCopy={
          libraryController.savedLibrary.savedTrackPlaybackStatusCopy
        }
        selectedLoopSourceId={
          libraryController.savedLibrary.selectedLoopSourceId
        }
        selectedTrack={libraryController.savedLibrary.selectedLoopTrack}
        setSelectedLoopSourceId={
          libraryController.savedLibrary.setSelectedLoopSourceId
        }
        togglePlayableItemPlayback={playback.togglePlayableItemPlayback}
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
    padding: 24,
    gap: 16,
  },
});
