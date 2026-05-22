import { type PlayableItem } from '@org/rehearsal-domain';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { DriveLibrarySource } from './drive-library-view-model';
import { DriveLibraryStatusCard } from './DriveLibraryStatusCard';
import {
  buildNamedLoop,
  getSavedLoopsStatusCopy,
  resolveSavedLoopCards,
} from './saved-loop-view-model';
import {
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from './saved-track-playback-view-model';
import { SavedLoopBuilderCard } from './SavedLoopBuilderCard';
import { SavedLoopList } from './SavedLoopList';
import { useSavedLoops } from './use-saved-loops';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from './use-saved-rehearsal-library';

type SavedLoopSectionProps = {
  activePlayableItem: PlayableItem | null;
  isPlaybackPreparing: boolean;
  playbackIssue: SavedTrackPlaybackIssue | null;
  playbackState: SavedTrackPlaybackState | undefined;
  positionSeconds: number;
  savedSources: DriveLibrarySource[];
  selectedTrack: PlayableItem | null;
  togglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
};

type DraftIssue = {
  title: string;
  message: string;
};

const PRIMARY_TEXT = '#1f1c17';
const SECONDARY_TEXT = '#5f5647';

export const SavedLoopSection = ({
  activePlayableItem,
  isPlaybackPreparing,
  playbackIssue,
  playbackState,
  positionSeconds,
  savedSources,
  selectedTrack,
  togglePlayableItemPlayback,
}: SavedLoopSectionProps) => {
  const {
    canMutateLoops,
    isLoading,
    issue,
    pendingLoopId,
    saveLoop,
    savedLoops,
  } = useSavedLoops();
  const [loopName, setLoopName] = useState('');
  const [startMs, setStartMs] = useState<number | null>(null);
  const [endMs, setEndMs] = useState<number | null>(null);
  const [draftIssue, setDraftIssue] = useState<DraftIssue | null>(null);

  const isSelectedTrackActive =
    selectedTrack !== null && activePlayableItem?.id === selectedTrack.id;
  const currentPositionMs = Math.max(0, Math.round(positionSeconds * 1000));
  const savedLoopCards = resolveSavedLoopCards(savedLoops, savedSources);
  const unresolvedLoopCount = savedLoopCards.filter((loopCard) => {
    return loopCard.message !== undefined || loopCard.playableItem === null;
  }).length;
  const statusCopy = getSavedLoopsStatusCopy({
    isLoading,
    issue,
    savedLoopCount: savedLoopCards.length,
    unresolvedLoopCount,
  });
  const builderIssue =
    draftIssue ??
    (issue?.kind === 'save'
      ? {
          title: issue.title,
          message: issue.message,
        }
      : null);
  const isSavingLoop = pendingLoopId !== null;
  const canCaptureMarkers = isSelectedTrackActive;
  const canSaveLoop =
    selectedTrack !== null &&
    isSelectedTrackActive &&
    canMutateLoops &&
    !isSavingLoop;

  useEffect(() => {
    setLoopName('');
    setStartMs(null);
    setEndMs(null);
    setDraftIssue(null);
  }, [selectedTrack?.id]);

  const captureMarker = (marker: 'start' | 'end') => {
    setDraftIssue(null);

    if (marker === 'start') {
      setStartMs(currentPositionMs);
      return;
    }

    setEndMs(currentPositionMs);
  };

  const handleSaveLoop = async () => {
    if (!selectedTrack) {
      return;
    }

    const result = buildNamedLoop({
      endMs,
      loopName,
      ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
      source: selectedTrack.source,
      startMs,
    });

    if (result.issue || !result.loop) {
      setDraftIssue(result.issue);
      return;
    }

    const didSave = await saveLoop(result.loop);

    if (!didSave) {
      return;
    }

    setLoopName('');
    setStartMs(null);
    setEndMs(null);
    setDraftIssue(null);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionCopy}>
        <Text style={styles.eyebrow}>Saved loops</Text>
        <Text style={styles.sectionTitle}>Capture named practice segments</Text>
        <Text style={styles.sectionBody}>
          Use the active saved track to mark a start and end position, then save
          that range for direct playback without redefining the markers.
        </Text>
      </View>

      <DriveLibraryStatusCard
        isLoading={isLoading}
        loadingLabel="Refreshing saved loops…"
        statusCopy={statusCopy}
      />

      <SavedLoopBuilderCard
        builderIssue={builderIssue}
        canCaptureMarkers={canCaptureMarkers}
        canSaveLoop={canSaveLoop}
        currentPositionMs={currentPositionMs}
        endMs={endMs}
        isSavingLoop={isSavingLoop}
        loopName={loopName}
        onLoopNameChange={(value) => {
          setLoopName(value);
          setDraftIssue(null);
        }}
        onSaveLoop={() => {
          void handleSaveLoop();
        }}
        onSetEndMarker={() => {
          captureMarker('end');
        }}
        onSetStartMarker={() => {
          captureMarker('start');
        }}
        selectedTrack={selectedTrack}
        startMs={startMs}
      />

      <SavedLoopList
        activePlayableItem={activePlayableItem}
        isPlaybackPreparing={isPlaybackPreparing}
        loopCards={savedLoopCards}
        playbackIssue={playbackIssue}
        playbackState={playbackState}
        togglePlayableItemPlayback={togglePlayableItemPlayback}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionCopy: {
    gap: 8,
  },
  eyebrow: {
    color: SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: PRIMARY_TEXT,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  sectionBody: {
    color: SECONDARY_TEXT,
    fontSize: 14,
    lineHeight: 20,
  },
});
