import {
  createTrackPlayableItem,
  type PlayableItem,
} from '@org/audio-library-models';
import { StyleSheet, View } from 'react-native';

import {
  type DriveLibrarySource,
  type DriveLibraryStatusCopy,
} from '../utils/drive-library-view-model';
import { DriveLibrarySectionHeader } from './DriveLibrarySectionHeader';
import { DriveLibrarySourceGroup } from './DriveLibrarySourceGroup';
import { DriveLibraryStatusCard } from './DriveLibraryStatusCard';
import { getSavedRehearsalLibrarySourceIssue } from '../utils/saved-rehearsal-library-view-model';
import {
  getSavedTrackPlaybackActionCopy,
  getSavedTrackPlaybackItemIssue,
  isSavedTrackPlaybackActive,
  isSavedTrackPlaybackBusy,
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from '../utils/saved-track-playback-view-model';
import { SavedLoopSection } from './SavedLoopSection';
import type { SavedRehearsalLibraryIssue } from '../hooks/use-saved-rehearsal-library';

type SavedRehearsalLibrarySectionProps = {
  activePlayableItem: PlayableItem | null;
  canMutateLibrary: boolean;
  isPlaybackPreparing: boolean;
  isSavedLibraryLoading: boolean;
  pendingSourceId: string | null;
  playbackIssue: SavedTrackPlaybackIssue | null;
  playbackState: SavedTrackPlaybackState | undefined;
  positionSeconds: number;
  removeSource: (source: DriveLibrarySource) => Promise<void>;
  savedLibraryIssue: SavedRehearsalLibraryIssue | null;
  savedLibrarySources: DriveLibrarySource[];
  savedLibraryStatusCopy: DriveLibraryStatusCopy;
  savedTrackPlaybackStatusCopy: DriveLibraryStatusCopy | null;
  selectedLoopSourceId: string | null;
  selectedTrack: PlayableItem | null;
  setSelectedLoopSourceId: (sourceId: string) => void;
  togglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
  toggleSourcePlayback: (source: DriveLibrarySource) => Promise<void>;
};

const BORDER_COLOR = '#d6d1c4';

export const SavedRehearsalLibrarySection = ({
  activePlayableItem,
  canMutateLibrary,
  isPlaybackPreparing,
  isSavedLibraryLoading,
  pendingSourceId,
  playbackIssue,
  playbackState,
  positionSeconds,
  removeSource,
  savedLibraryIssue,
  savedLibrarySources,
  savedLibraryStatusCopy,
  savedTrackPlaybackStatusCopy,
  selectedLoopSourceId,
  selectedTrack,
  setSelectedLoopSourceId,
  togglePlayableItemPlayback,
  toggleSourcePlayback,
}: SavedRehearsalLibrarySectionProps) => {
  const isSavedLibraryMutating = pendingSourceId !== null;
  const isSavedTrackPlaybackLoading = isSavedTrackPlaybackBusy({
    isPreparing: isPlaybackPreparing,
    playbackState,
  });
  const savedSourceTitle = `Saved rehearsal tracks (${savedLibrarySources.length})`;

  return (
    <View style={styles.savedLibrarySection}>
      <DriveLibrarySectionHeader
        canRefresh={false}
        isLoading={false}
        onRefresh={() => undefined}
        title="Saved rehearsal library"
        body="Keep explicit Google Drive references ready for full-track playback, loops, and playlists without copying the source media."
        eyebrow="Saved tracks"
      />
      <DriveLibraryStatusCard
        isLoading={isSavedLibraryLoading}
        loadingLabel="Refreshing saved rehearsal tracks…"
        statusCopy={savedLibraryStatusCopy}
      />
      {savedTrackPlaybackStatusCopy ? (
        <DriveLibraryStatusCard
          isLoading={isSavedTrackPlaybackLoading}
          loadingLabel="Starting track playback…"
          statusCopy={savedTrackPlaybackStatusCopy}
        />
      ) : null}
      <DriveLibrarySourceGroup
        getActions={(source) => {
          const isPending = pendingSourceId === source.id;
          const trackPlayableItem = createTrackPlayableItem(source);
          const playbackAction = getSavedTrackPlaybackActionCopy({
            activePlayableItem,
            isPreparing: isPlaybackPreparing,
            playableItem: trackPlayableItem,
            playbackState,
          });
          const isPlaybackSourceActive = isSavedTrackPlaybackActive(
            activePlayableItem,
            trackPlayableItem,
          );

          return [
            {
              disabled: isSavedLibraryMutating || playbackAction.disabled,
              label: playbackAction.label,
              onPress: () => {
                setSelectedLoopSourceId(source.id);
                void toggleSourcePlayback(source);
              },
              tone: 'primary' as const,
            },
            {
              disabled:
                isSavedLibraryMutating ||
                source.availability.status !== 'available',
              label:
                selectedLoopSourceId === source.id
                  ? 'Selected for loop'
                  : 'Use for loop',
              onPress: () => {
                setSelectedLoopSourceId(source.id);
              },
            },
            {
              disabled:
                !canMutateLibrary ||
                isSavedLibraryMutating ||
                isPlaybackSourceActive,
              label: isPending ? 'Removing…' : 'Remove',
              onPress: () => {
                void removeSource(source);
              },
            },
          ];
        }}
        getMessage={(source) => {
          return (
            getSavedRehearsalLibrarySourceIssue(
              savedLibraryIssue,
              source,
              'remove',
            ) ??
            getSavedTrackPlaybackItemIssue(
              playbackIssue,
              createTrackPlayableItem(source),
            )
          );
        }}
        sources={savedLibrarySources}
        title={savedSourceTitle}
      />
      <SavedLoopSection
        activePlayableItem={activePlayableItem}
        isPlaybackPreparing={isPlaybackPreparing}
        playbackIssue={playbackIssue}
        playbackState={playbackState}
        positionSeconds={positionSeconds}
        savedSources={savedLibrarySources}
        selectedTrack={selectedTrack}
        togglePlayableItemPlayback={togglePlayableItemPlayback}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  savedLibrarySection: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    backgroundColor: '#faf6ee',
  },
});
