import { type NamedLoop, type PlayableItem } from '@org/audio-library-models';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { DriveLibrarySource } from '../utils/drive-library-view-model';
import type { SavedPlaylistLibraryActionCopy } from '../utils/saved-playlist-view-model';
import type { SavedLoopIssue } from '../utils/saved-loop-view-model';
import { DriveLibraryStatusCard } from './DriveLibraryStatusCard';
import {
  buildNamedLoop,
  getSavedLoopsStatusCopy,
  resolveSavedLoopCards,
} from '../utils/saved-loop-view-model';
import {
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from '../utils/saved-track-playback-view-model';
import { SavedLoopBuilderCard } from './SavedLoopBuilderCard';
import { SavedLoopList } from './SavedLoopList';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../hooks/use-saved-rehearsal-library';

type SavedLoopSectionProps = {
  activePlayableItem: PlayableItem | null;
  isPlaybackPreparing: boolean;
  canMutateLoops: boolean;
  isSavedLoopsLoading: boolean;
  pendingLoopId: string | null;
  playbackIssue: SavedTrackPlaybackIssue | null;
  playbackState: SavedTrackPlaybackState | undefined;
  playlistActionCopy: SavedPlaylistLibraryActionCopy;
  positionSeconds: number;
  removeLoop: (loop: NamedLoop) => void;
  savedSources: DriveLibrarySource[];
  savedLoopIssue: SavedLoopIssue | null;
  savedLoops: NamedLoop[];
  saveLoop: (loop: NamedLoop) => Promise<boolean>;
  selectedTrack: PlayableItem | null;
  addLoopToPlaylist: (loop: NamedLoop) => void;
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
  canMutateLoops,
  isSavedLoopsLoading,
  pendingLoopId,
  playbackIssue,
  playbackState,
  playlistActionCopy,
  positionSeconds,
  removeLoop,
  savedSources,
  savedLoopIssue,
  savedLoops,
  saveLoop,
  selectedTrack,
  addLoopToPlaylist,
  togglePlayableItemPlayback,
}: SavedLoopSectionProps) => {
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
    isLoading: isSavedLoopsLoading,
    issue: savedLoopIssue,
    savedLoopCount: savedLoopCards.length,
    unresolvedLoopCount,
  });
  const builderIssue =
    draftIssue ??
    (savedLoopIssue?.kind === 'save'
      ? {
          title: savedLoopIssue.title,
          message: savedLoopIssue.message,
        }
      : null);
  const isLoopMutating = pendingLoopId !== null;
  const canCaptureMarkers = isSelectedTrackActive;
  const canSaveLoop =
    selectedTrack !== null &&
    isSelectedTrackActive &&
    canMutateLoops &&
    !isLoopMutating;

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
        isLoading={isSavedLoopsLoading}
        loadingLabel="Refreshing saved loops…"
        statusCopy={statusCopy}
      />

      <SavedLoopBuilderCard
        builderIssue={builderIssue}
        canCaptureMarkers={canCaptureMarkers}
        canSaveLoop={canSaveLoop}
        currentPositionMs={currentPositionMs}
        endMs={endMs}
        isSavingLoop={isLoopMutating}
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
        addLoopToPlaylist={addLoopToPlaylist}
        canMutateLoops={canMutateLoops}
        isPlaybackPreparing={isPlaybackPreparing}
        loopCards={savedLoopCards}
        loopIssue={savedLoopIssue}
        pendingLoopId={pendingLoopId}
        playbackIssue={playbackIssue}
        playbackState={playbackState}
        playlistActionCopy={playlistActionCopy}
        removeLoop={removeLoop}
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
