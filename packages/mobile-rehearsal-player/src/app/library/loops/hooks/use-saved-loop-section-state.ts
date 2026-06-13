import {
  validateLoopRange,
  type NamedLoop,
  type PlayableItem,
} from '@org/audio-library-models';
import { useEffect, useState } from 'react';

import type { SavedTrackPlaybackState } from '../../playback/utils/saved-track-playback-view-model';
import { getSavedTrackPlaybackActionCopy } from '../../playback/utils/saved-track-playback-view-model';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../../hooks/use-saved-rehearsal-library';
import { resolveLoopPreviewPlaybackTimeline } from '../utils/saved-loop-preview-playback-view-model';
import type { SavedLoopIssue } from '../utils/saved-loop-view-model';
import {
  buildNamedLoop,
  createLoopBuilderDraft,
  createLoopPreviewPlayableItem,
  resolveActiveLoopEditorId,
  resolveLoopBuilderRangeSelection,
  type LoopBuilderDraft,
} from '../utils/saved-loop-view-model';
import { updateLoopBuilderDraftRange } from '../utils/saved-loop-view-model';

type DraftIssue = {
  title: string;
  message: string;
};

type UseSavedLoopSectionStateOptions = {
  activePlayableItem: PlayableItem | null;
  canMutateLoops: boolean;
  editingLoop: NamedLoop | null;
  isPlaybackPreparing: boolean;
  onCloseLoopBuilder: () => void;
  pendingLoopId: string | null;
  playbackPositionSeconds: number;
  playbackState: SavedTrackPlaybackState | undefined;
  saveLoop: (loop: NamedLoop) => Promise<boolean>;
  savedLoopIssue: SavedLoopIssue | null;
  selectedTrack: PlayableItem | null;
  togglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
};

const EMPTY_LOOP_BUILDER_DRAFT: LoopBuilderDraft = {
  endMs: 0,
  loopName: '',
  startMs: 0,
  suggestedLoopName: '',
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

export const useSavedLoopSectionState = (
  options: UseSavedLoopSectionStateOptions,
) => {
  const [loopDraft, setLoopDraft] = useState<LoopBuilderDraft>(
    EMPTY_LOOP_BUILDER_DRAFT,
  );
  const [draftIssue, setDraftIssue] = useState<DraftIssue | null>(null);

  const selectedTrackDurationMs =
    options.selectedTrack?.range.endMs ??
    options.selectedTrack?.source.durationMs ??
    null;
  const rangeValidation = validateLoopRange(
    loopDraft.startMs,
    loopDraft.endMs,
    selectedTrackDurationMs ?? undefined,
  );
  const previewPlayableItem =
    options.selectedTrack && rangeValidation.isValid
      ? createLoopPreviewPlayableItem({
          endMs: rangeValidation.normalizedEndMs,
          selectedTrack: options.selectedTrack,
          startMs: rangeValidation.normalizedStartMs,
        })
      : null;
  const previewActionCopy = previewPlayableItem
    ? getSavedTrackPlaybackActionCopy({
        activePlayableItem: options.activePlayableItem,
        isPreparing: options.isPlaybackPreparing,
        playableItem: previewPlayableItem,
        playbackState: options.playbackState,
      })
    : {
        disabled: true,
        label: 'Preview',
      };
  const previewTimeline = resolveLoopPreviewPlaybackTimeline({
    activePlayableItem: options.activePlayableItem,
    playbackPositionSeconds: options.playbackPositionSeconds,
    previewPlayableItem,
  });
  const durationIssue =
    options.selectedTrack && selectedTrackDurationMs === null
      ? {
          title: 'Track duration unavailable',
          message:
            'Google Drive did not provide a track length for this saved rehearsal track, so the loop range cannot be set yet.',
        }
      : null;
  const saveIssue =
    options.savedLoopIssue?.kind === 'save'
      ? {
          title: options.savedLoopIssue.title,
          message: options.savedLoopIssue.message,
        }
      : null;
  const builderIssue = draftIssue ?? durationIssue ?? saveIssue;
  const isLoopMutating = options.pendingLoopId !== null;
  const canSaveLoop =
    options.selectedTrack !== null &&
    selectedTrackDurationMs !== null &&
    options.canMutateLoops &&
    !isLoopMutating &&
    rangeValidation.isValid;
  const isEditingLoop = options.editingLoop !== null;
  const activeEditingLoopId = resolveActiveLoopEditorId({
    editingLoopId: options.editingLoop?.id ?? null,
    selectedTrack: options.selectedTrack,
  });

  useEffect(() => {
    if (!options.selectedTrack) {
      setLoopDraft(EMPTY_LOOP_BUILDER_DRAFT);
      setDraftIssue(null);
      return;
    }

    if (options.editingLoop) {
      const nextDraft = createLoopBuilderDraft({
        endMs: options.editingLoop.endMs,
        sourceName: options.selectedTrack.source.name,
        startMs: options.editingLoop.startMs,
      });

      setLoopDraft({
        ...nextDraft,
        loopName: options.editingLoop.name,
      });
      setDraftIssue(null);
      return;
    }

    const nextEndMs =
      options.selectedTrack.range.endMs ??
      options.selectedTrack.source.durationMs ??
      options.selectedTrack.range.startMs;

    setLoopDraft(
      createLoopBuilderDraft({
        endMs: nextEndMs,
        sourceName: options.selectedTrack.source.name,
        startMs: options.selectedTrack.range.startMs,
      }),
    );
    setDraftIssue(null);
  }, [options.editingLoop?.id, options.selectedTrack?.id]);

  return {
    activeEditingLoopId,
    builderIssue,
    canSaveLoop,
    handleLoopNameChange: (value: string) => {
      setLoopDraft((currentDraft) => {
        return {
          ...currentDraft,
          loopName: value,
        };
      });
      setDraftIssue(null);
    },
    handleRangeChange: (sliderValue: number | number[]) => {
      const nextRange = resolveLoopBuilderRangeSelection({
        durationMs: selectedTrackDurationMs ?? undefined,
        sliderValue,
      });

      setLoopDraft((currentDraft) => {
        return updateLoopBuilderDraftRange({
          draft: currentDraft,
          endMs: nextRange.endMs,
          sourceName: options.selectedTrack?.source.name ?? '',
          startMs: nextRange.startMs,
        });
      });
      setDraftIssue(null);
    },
    handleSaveLoop: async () => {
      if (!options.selectedTrack) {
        return;
      }

      const result = buildNamedLoop({
        endMs: loopDraft.endMs,
        existingLoop: options.editingLoop
          ? {
              createdAt: options.editingLoop.createdAt,
              id: options.editingLoop.id,
            }
          : undefined,
        loopName: loopDraft.loopName,
        ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
        source: options.selectedTrack.source,
        startMs: loopDraft.startMs,
      });

      if (result.issue || !result.loop) {
        setDraftIssue(result.issue);
        return;
      }

      const didSave = await options.saveLoop(result.loop);

      if (!didSave) {
        return;
      }

      setLoopDraft(EMPTY_LOOP_BUILDER_DRAFT);
      setDraftIssue(null);
      options.onCloseLoopBuilder();
    },
    handleTogglePreview: () => {
      if (!previewPlayableItem) {
        return;
      }

      void options.togglePlayableItemPlayback(previewPlayableItem);
    },
    isEditingLoop,
    loopDraft,
    previewActionLabel: getPreviewActionLabel(previewActionCopy.label),
    previewDisabled: previewActionCopy.disabled || previewPlayableItem === null,
    previewPlayableItem,
    previewTimeline,
    selectedTrackDurationMs,
  };
};
