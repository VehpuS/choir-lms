import {
  validateLoopRange,
  type NamedLoop,
  type PlayableItem,
} from '@org/audio-library-models';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DriveLibraryStatusCard } from '../../drive/components/drive-library-status-card';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../../hooks/use-saved-rehearsal-library';
import {
  getSavedTrackPlaybackActionCopy,
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from '../../playback/utils/saved-track-playback-view-model';
import type { PlaylistPlaybackActionCopy } from '../../playlists/utils/saved-playlist-playback-view-model';
import { resolveLoopPreviewPlaybackTimeline } from '../utils/saved-loop-preview-playback-view-model';
import type {
  LoopBuilderDraft,
  SavedLoopIssue,
} from '../utils/saved-loop-view-model';
import {
  buildNamedLoop,
  createLoopBuilderDraft,
  createLoopPreviewPlayableItem,
  getSavedLoopsStatusCopy,
  resolveActiveLoopEditorId,
  resolveLoopBuilderRangeSelection,
  resolveSavedLoopCards,
  SAVED_LOOP_SECTION_BODY_COPY,
  updateLoopBuilderDraftRange,
} from '../utils/saved-loop-view-model';
import type { TrackScopedLoopDetailCopy } from '../utils/track-scoped-loop-view-model';
import { useLoopPreviewPlaybackContext } from './loop-preview-playback-context';
import { LoopRangeSelectorSurface } from './loop-range-selector-surface';
import { SavedLoopList } from './saved-loop-list';
import { TrackScopedLoopDetailCard } from './track-scoped-loop-detail-card';

type SavedLoopSectionProps = {
  activePlayableItem: PlayableItem | null;
  editingLoop: NamedLoop | null;
  isPlaybackPreparing: boolean;
  isTrackLoopDetailVisible: boolean;
  canMutateLoops: boolean;
  canQueueAsNext: boolean;
  highlightQuery: string | null;
  isSavedLoopsLoading: boolean;
  pendingLoopId: string | null;
  playbackIssue: SavedTrackPlaybackIssue | null;
  playbackState: SavedTrackPlaybackState | undefined;
  canMutatePlaylists: boolean;
  isPlaylistMutating: boolean;
  onCloseLoopBuilder: () => void;
  onEditLoop: (loop: NamedLoop) => void;
  toggleActivePlayback: () => Promise<void>;
  removeLoop: (loop: NamedLoop) => void;
  savedSources: DriveLibrarySource[];
  savedLoopIssue: SavedLoopIssue | null;
  savedLoops: NamedLoop[];
  saveLoop: (loop: NamedLoop) => Promise<boolean>;
  selectedTrack: PlayableItem | null;
  trackLoopView: {
    detailCopy: TrackScopedLoopDetailCopy;
    isMakeNewLoopDisabled: boolean;
    loops: NamedLoop[];
    makeNewLoopLabel: string;
    onClose: () => void;
    onMakeNewLoop: () => void;
    onPlayLoopSeries: (loopId?: string) => void;
    orderedPlaybackAction: PlaylistPlaybackActionCopy;
  } | null;
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
const EMPTY_LOOP_BUILDER_DRAFT: LoopBuilderDraft = {
  endMs: 0,
  loopName: '',
  startMs: 0,
  suggestedLoopName: '',
};

export const SavedLoopSection = ({
  activePlayableItem,
  editingLoop,
  isPlaybackPreparing,
  isTrackLoopDetailVisible,
  canMutateLoops,
  canQueueAsNext,
  highlightQuery,
  isSavedLoopsLoading,
  pendingLoopId,
  playbackIssue,
  playbackState,
  canMutatePlaylists,
  isPlaylistMutating,
  onCloseLoopBuilder,
  onEditLoop,
  toggleActivePlayback,
  removeLoop,
  savedSources,
  savedLoopIssue,
  savedLoops,
  saveLoop,
  selectedTrack,
  trackLoopView,
  onOpenLoopPlaylistSelector,
  togglePlayableItemPlayback,
  queuePlayableItemNext,
  queuePlayableItemUpNext,
}: SavedLoopSectionProps) => {
  const { playbackPositionSeconds, seekActivePlaybackToPosition } =
    useLoopPreviewPlaybackContext();
  const [loopDraft, setLoopDraft] = useState<LoopBuilderDraft>(
    EMPTY_LOOP_BUILDER_DRAFT,
  );
  const [draftIssue, setDraftIssue] = useState<DraftIssue | null>(null);

  const savedLoopCards = resolveSavedLoopCards(savedLoops, savedSources);
  const trackLoopViewCards = trackLoopView
    ? resolveSavedLoopCards(trackLoopView.loops, savedSources)
    : [];
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
    loopDraft.startMs,
    loopDraft.endMs,
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
  const previewTimeline = resolveLoopPreviewPlaybackTimeline({
    activePlayableItem,
    playbackPositionSeconds,
    previewPlayableItem,
  });
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
  const isEditingLoop = editingLoop !== null;
  const activeEditingLoopId = resolveActiveLoopEditorId({
    editingLoopId: editingLoop?.id ?? null,
    selectedTrack,
  });

  useEffect(() => {
    if (!selectedTrack) {
      setLoopDraft(EMPTY_LOOP_BUILDER_DRAFT);
      setDraftIssue(null);
      return;
    }

    if (editingLoop) {
      const nextDraft = createLoopBuilderDraft({
        endMs: editingLoop.endMs,
        sourceName: selectedTrack.source.name,
        startMs: editingLoop.startMs,
      });

      setLoopDraft({
        ...nextDraft,
        loopName: editingLoop.name,
      });
      setDraftIssue(null);
      return;
    }

    const nextEndMs =
      selectedTrack.range.endMs ??
      selectedTrack.source.durationMs ??
      selectedTrack.range.startMs;

    setLoopDraft(
      createLoopBuilderDraft({
        endMs: nextEndMs,
        sourceName: selectedTrack.source.name,
        startMs: selectedTrack.range.startMs,
      }),
    );
    setDraftIssue(null);
  }, [editingLoop?.id, selectedTrack?.id]);

  const handleSaveLoop = async () => {
    if (!selectedTrack) {
      return;
    }

    const result = buildNamedLoop({
      endMs: loopDraft.endMs,
      existingLoop: editingLoop
        ? {
            createdAt: editingLoop.createdAt,
            id: editingLoop.id,
          }
        : undefined,
      loopName: loopDraft.loopName,
      ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
      source: selectedTrack.source,
      startMs: loopDraft.startMs,
    });

    if (result.issue || !result.loop) {
      setDraftIssue(result.issue);
      return;
    }

    const didSave = await saveLoop(result.loop);

    if (!didSave) {
      return;
    }

    setLoopDraft(EMPTY_LOOP_BUILDER_DRAFT);
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
      {!isTrackLoopDetailVisible ? (
        <View style={styles.sectionCopy}>
          <Text style={styles.eyebrow}>Saved loops</Text>
          <Text style={styles.sectionTitle}>Saved loops</Text>
          <Text style={styles.sectionBody}>{SAVED_LOOP_SECTION_BODY_COPY}</Text>
        </View>
      ) : null}

      {!isTrackLoopDetailVisible && shouldShowStatusCard ? (
        <DriveLibraryStatusCard
          isLoading={isSavedLoopsLoading}
          loadingLabel="Refreshing saved loops…"
          statusCopy={statusCopy}
        />
      ) : null}

      {isTrackLoopDetailVisible && trackLoopView ? (
        <TrackScopedLoopDetailCard
          detailCopy={trackLoopView.detailCopy}
          isMakeNewLoopDisabled={trackLoopView.isMakeNewLoopDisabled}
          makeNewLoopLabel={trackLoopView.makeNewLoopLabel}
          onClose={trackLoopView.onClose}
          onMakeNewLoop={trackLoopView.onMakeNewLoop}
          onPlayOrderedTrackLoops={() => {
            trackLoopView.onPlayLoopSeries();
          }}
          orderedPlaybackAction={trackLoopView.orderedPlaybackAction}
        >
          {trackLoopViewCards.length > 0 ? (
            <SavedLoopList
              activePlayableItem={activePlayableItem}
              canMutateLoops={canMutateLoops}
              canMutatePlaylists={canMutatePlaylists}
              canQueueAsNext={canQueueAsNext}
              editingLoopId={activeEditingLoopId}
              highlightQuery={null}
              isPlaybackPreparing={isPlaybackPreparing}
              isPlaylistMutating={isPlaylistMutating}
              loopCards={trackLoopViewCards}
              loopIssue={savedLoopIssue}
              onEditLoop={onEditLoop}
              onOpenLoopPlaylistSelector={onOpenLoopPlaylistSelector}
              onPlayLoopSeries={(loopId) => {
                trackLoopView.onPlayLoopSeries(loopId);
              }}
              onToggleCurrentPlayback={() => {
                void toggleActivePlayback();
              }}
              pendingLoopId={pendingLoopId}
              playbackIssue={playbackIssue}
              playbackState={playbackState}
              queuePlayableItemNext={queuePlayableItemNext}
              queuePlayableItemUpNext={queuePlayableItemUpNext}
              removeLoop={removeLoop}
              title={`Track loops (${trackLoopViewCards.length})`}
              togglePlayableItemPlayback={togglePlayableItemPlayback}
            />
          ) : (
            <Text style={styles.sectionBody}>
              {trackLoopView.detailCopy.emptyMessage}
            </Text>
          )}
        </TrackScopedLoopDetailCard>
      ) : null}

      <LoopRangeSelectorSurface
        builderIssue={builderIssue}
        canSaveLoop={canSaveLoop}
        endMs={loopDraft.endMs}
        eyebrowLabel={isEditingLoop ? 'Edit loop' : 'New loop'}
        isSavingLoop={isLoopMutating}
        isVisible={selectedTrack !== null}
        loopName={loopDraft.loopName}
        onClose={onCloseLoopBuilder}
        onLoopNameChange={(value) => {
          setLoopDraft((currentDraft) => {
            return {
              ...currentDraft,
              loopName: value,
            };
          });
          setDraftIssue(null);
        }}
        onRangeChange={(sliderValue) => {
          const nextRange = resolveLoopBuilderRangeSelection({
            durationMs: selectedTrackDurationMs ?? undefined,
            sliderValue,
          });

          setLoopDraft((currentDraft) => {
            return updateLoopBuilderDraftRange({
              draft: currentDraft,
              endMs: nextRange.endMs,
              sourceName: selectedTrack?.source.name ?? '',
              startMs: nextRange.startMs,
            });
          });
          setDraftIssue(null);
        }}
        onSaveLoop={() => {
          void handleSaveLoop();
        }}
        onScrubPreview={(positionSeconds) => {
          void seekActivePlaybackToPosition(positionSeconds);
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
        previewPlayableItem={previewPlayableItem}
        previewTimeline={previewTimeline}
        rangeMaximumMs={selectedTrackDurationMs}
        saveActionLabel={isEditingLoop ? 'Save changes' : 'Save loop'}
        selectedTrack={selectedTrack}
        savingActionLabel={isEditingLoop ? 'Saving changes…' : 'Saving loop…'}
        startMs={loopDraft.startMs}
      />

      {!isTrackLoopDetailVisible ? (
        <SavedLoopList
          activePlayableItem={activePlayableItem}
          canMutateLoops={canMutateLoops}
          canMutatePlaylists={canMutatePlaylists}
          editingLoopId={activeEditingLoopId}
          highlightQuery={highlightQuery}
          isPlaylistMutating={isPlaylistMutating}
          isPlaybackPreparing={isPlaybackPreparing}
          loopCards={savedLoopCards}
          loopIssue={savedLoopIssue}
          pendingLoopId={pendingLoopId}
          playbackIssue={playbackIssue}
          playbackState={playbackState}
          canQueueAsNext={canQueueAsNext}
          onEditLoop={onEditLoop}
          onOpenLoopPlaylistSelector={onOpenLoopPlaylistSelector}
          queuePlayableItemNext={queuePlayableItemNext}
          queuePlayableItemUpNext={queuePlayableItemUpNext}
          removeLoop={removeLoop}
          title={`Saved loops (${savedLoopCards.length})`}
          togglePlayableItemPlayback={togglePlayableItemPlayback}
        />
      ) : null}
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
