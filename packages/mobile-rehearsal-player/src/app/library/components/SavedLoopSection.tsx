import {
  validateLoopRange,
  type NamedLoop,
  type PlayableItem,
} from '@org/audio-library-models';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../hooks/use-saved-rehearsal-library';
import type { DriveLibrarySource } from '../utils/drive-library-view-model';
import type { SavedLoopIssue } from '../utils/saved-loop-view-model';
import {
  buildNamedLoop,
  createLoopPreviewPlayableItem,
  getSavedLoopsStatusCopy,
  resolveLoopBuilderRangeSelection,
  resolveSavedLoopCards,
} from '../utils/saved-loop-view-model';
import {
  getSavedTrackPlaybackActionCopy,
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from '../utils/saved-track-playback-view-model';
import { DriveLibraryStatusCard } from './DriveLibraryStatusCard';
import { LoopRangeSelectorSurface } from './LoopRangeSelectorSurface';
import { SavedLoopList } from './SavedLoopList';

type SavedLoopSectionProps = {
  activePlayableItem: PlayableItem | null;
  isPlaybackPreparing: boolean;
  canMutateLoops: boolean;
  canQueueAsNext: boolean;
  isSavedLoopsLoading: boolean;
  pendingLoopId: string | null;
  playbackIssue: SavedTrackPlaybackIssue | null;
  playbackState: SavedTrackPlaybackState | undefined;
  canMutatePlaylists: boolean;
  isPlaylistMutating: boolean;
  onCloseLoopBuilder: () => void;
  removeLoop: (loop: NamedLoop) => void;
  savedSources: DriveLibrarySource[];
  savedLoopIssue: SavedLoopIssue | null;
  savedLoops: NamedLoop[];
  saveLoop: (loop: NamedLoop) => Promise<boolean>;
  selectedTrack: PlayableItem | null;
  onOpenLoopPlaylistSelector: (loopId: string) => void;
  togglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
  queuePlayableItemNext: (playableItem: PlayableItem) => void;
  queuePlayableItemUpNext: (playableItem: PlayableItem) => void;
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
  canQueueAsNext,
  isSavedLoopsLoading,
  pendingLoopId,
  playbackIssue,
  playbackState,
  canMutatePlaylists,
  isPlaylistMutating,
  onCloseLoopBuilder,
  removeLoop,
  savedSources,
  savedLoopIssue,
  savedLoops,
  saveLoop,
  selectedTrack,
  onOpenLoopPlaylistSelector,
  togglePlayableItemPlayback,
  queuePlayableItemNext,
  queuePlayableItemUpNext,
}: SavedLoopSectionProps) => {
  const [loopName, setLoopName] = useState('');
  const [startMs, setStartMs] = useState(0);
  const [endMs, setEndMs] = useState(0);
  const [draftIssue, setDraftIssue] = useState<DraftIssue | null>(null);

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
  const saveIssue =
    savedLoopIssue?.kind === 'save'
      ? {
          title: savedLoopIssue.title,
          message: savedLoopIssue.message,
        }
      : null;
  const isLoopMutating = pendingLoopId !== null;
  const selectedTrackDurationMs =
    selectedTrack?.range.endMs ?? selectedTrack?.source.durationMs ?? null;
  const rangeValidation = validateLoopRange(
    startMs,
    endMs,
    selectedTrackDurationMs ?? undefined,
  );
  const previewPlayableItem =
    selectedTrack && rangeValidation.isValid
      ? createLoopPreviewPlayableItem({
          endMs: rangeValidation.normalizedEndMs,
          selectedTrack,
          startMs: rangeValidation.normalizedStartMs,
        })
      : null;
  const previewActionCopy = previewPlayableItem
    ? getSavedTrackPlaybackActionCopy({
        activePlayableItem,
        isPreparing: isPlaybackPreparing,
        playableItem: previewPlayableItem,
        playbackState,
      })
    : {
        disabled: true,
        label: 'Preview',
      };
  const durationIssue =
    selectedTrack && selectedTrackDurationMs === null
      ? {
          title: 'Track duration unavailable',
          message:
            'Google Drive did not provide a track length for this saved rehearsal track, so the loop range cannot be set yet.',
        }
      : null;
  const builderIssue = draftIssue ?? durationIssue ?? saveIssue;
  const canSaveLoop =
    selectedTrack !== null &&
    selectedTrackDurationMs !== null &&
    canMutateLoops &&
    !isLoopMutating &&
    rangeValidation.isValid;
  const shouldShowStatusCard =
    isSavedLoopsLoading || statusCopy.tone !== 'ready';

  useEffect(() => {
    if (!selectedTrack) {
      setLoopName('');
      setStartMs(0);
      setEndMs(0);
      setDraftIssue(null);
      return;
    }

    const nextEndMs =
      selectedTrack.range.endMs ??
      selectedTrack.source.durationMs ??
      selectedTrack.range.startMs;

    setLoopName('');
    setStartMs(selectedTrack.range.startMs);
    setEndMs(nextEndMs);
    setDraftIssue(null);
  }, [selectedTrack?.id]);

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
    setStartMs(selectedTrack.range.startMs);
    setEndMs(selectedTrackDurationMs ?? selectedTrack.range.startMs);
    setDraftIssue(null);
    onCloseLoopBuilder();
  };

  const getPreviewActionLabel = (label: string) => {
    if (label === 'Play') {
      return 'Preview';
    }

    if (label === 'Loading…') {
      return label;
    }

    return `${label} preview`;
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionCopy}>
        <Text style={styles.eyebrow}>Saved loops</Text>
        <Text style={styles.sectionTitle}>Saved loops</Text>
      </View>

      {shouldShowStatusCard ? (
        <DriveLibraryStatusCard
          isLoading={isSavedLoopsLoading}
          loadingLabel="Refreshing saved loops…"
          statusCopy={statusCopy}
        />
      ) : null}

      <LoopRangeSelectorSurface
        builderIssue={builderIssue}
        canSaveLoop={canSaveLoop}
        endMs={endMs}
        isSavingLoop={isLoopMutating}
        isVisible={selectedTrack !== null}
        loopName={loopName}
        onClose={onCloseLoopBuilder}
        onLoopNameChange={(value) => {
          setLoopName(value);
          setDraftIssue(null);
        }}
        onRangeChange={(sliderValue) => {
          const nextRange = resolveLoopBuilderRangeSelection({
            durationMs: selectedTrackDurationMs ?? undefined,
            sliderValue,
          });

          setDraftIssue(null);
          setStartMs(nextRange.startMs);
          setEndMs(nextRange.endMs);
        }}
        onSaveLoop={() => {
          void handleSaveLoop();
        }}
        onTogglePreview={() => {
          if (!previewPlayableItem) {
            return;
          }

          void togglePlayableItemPlayback(previewPlayableItem);
        }}
        previewActionLabel={getPreviewActionLabel(previewActionCopy.label)}
        previewDisabled={
          previewActionCopy.disabled || previewPlayableItem === null
        }
        rangeMaximumMs={selectedTrackDurationMs}
        selectedTrack={selectedTrack}
        startMs={startMs}
      />

      <SavedLoopList
        activePlayableItem={activePlayableItem}
        canMutateLoops={canMutateLoops}
        canMutatePlaylists={canMutatePlaylists}
        isPlaylistMutating={isPlaylistMutating}
        isPlaybackPreparing={isPlaybackPreparing}
        loopCards={savedLoopCards}
        loopIssue={savedLoopIssue}
        pendingLoopId={pendingLoopId}
        playbackIssue={playbackIssue}
        playbackState={playbackState}
        canQueueAsNext={canQueueAsNext}
        onOpenLoopPlaylistSelector={onOpenLoopPlaylistSelector}
        queuePlayableItemNext={queuePlayableItemNext}
        queuePlayableItemUpNext={queuePlayableItemUpNext}
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
