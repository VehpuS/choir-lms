import {
  createTrackPlayableItem,
  type PlayableItem,
  validateLoopRange,
} from '@org/audio-library-models';
import { keyBy } from 'es-toolkit/compat';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { formatDurationLabel } from '../../drive/utils/drive-library-view-model';

type ResolveLoopBuilderTrackOptions = {
  savedSources: DriveLibrarySource[];
  selectedSourceId: string | null;
};

type ResolveLoopBuilderRangeSelectionOptions = {
  durationMs?: number;
  sliderValue: number | number[];
};

type DefaultLoopNameOptions = {
  endMs: number;
  sourceName: string;
  startMs: number;
};

export type LoopBuilderDraft = {
  endMs: number;
  loopName: string;
  startMs: number;
  suggestedLoopName: string;
};

type UpdateLoopBuilderDraftRangeOptions = {
  draft: LoopBuilderDraft;
  endMs: number;
  sourceName: string;
  startMs: number;
};

type ResolveActiveLoopEditorIdOptions = {
  editingLoopId: string | null;
  selectedTrack: PlayableItem | null;
};

type ResolveLoopBuilderTrackDurationOptions = {
  activePlayableItem: PlayableItem | null;
  playbackDurationSeconds: number;
  resolvedDurationMs: number | null | undefined;
  selectedTrack: PlayableItem | null;
};

type ResolveSourcesMissingLoopBuilderDurationOptions = {
  resolvedDurationsBySourceId: Partial<Record<string, number | null>>;
  retryFailedLookup?: boolean;
  savedSources: DriveLibrarySource[];
};

const formatLoopNameRangeLabel = (
  loop: Pick<DefaultLoopNameOptions, 'startMs' | 'endMs'>,
) => {
  const startLabel = formatDurationLabel(loop.startMs) ?? '0:00';
  const endLabel = formatDurationLabel(loop.endMs) ?? '0:00';

  return `${startLabel} - ${endLabel}`;
};

export const getDefaultLoopName = (options: DefaultLoopNameOptions) => {
  return `Loop ${formatLoopNameRangeLabel(options)} • ${options.sourceName}`;
};

export const createLoopBuilderDraft = (
  options: DefaultLoopNameOptions,
): LoopBuilderDraft => {
  const suggestedLoopName = getDefaultLoopName(options);

  return {
    endMs: options.endMs,
    loopName: suggestedLoopName,
    startMs: options.startMs,
    suggestedLoopName,
  };
};

export const updateLoopBuilderDraftRange = (
  options: UpdateLoopBuilderDraftRangeOptions,
): LoopBuilderDraft => {
  const suggestedLoopName = getDefaultLoopName({
    endMs: options.endMs,
    sourceName: options.sourceName,
    startMs: options.startMs,
  });
  const followsSuggestedLoopName =
    options.draft.loopName.trim() === options.draft.suggestedLoopName.trim();

  return {
    endMs: options.endMs,
    loopName: followsSuggestedLoopName
      ? suggestedLoopName
      : options.draft.loopName,
    startMs: options.startMs,
    suggestedLoopName,
  };
};

export const resolveActiveLoopEditorId = (
  options: ResolveActiveLoopEditorIdOptions,
) => {
  if (options.editingLoopId === null) {
    return null;
  }

  return options.selectedTrack === null ? null : options.editingLoopId;
};

export const resolveLoopBuilderTrack = (
  options: ResolveLoopBuilderTrackOptions,
) => {
  const savedSourcesById: Partial<Record<string, DriveLibrarySource>> = keyBy(
    options.savedSources,
    (source) => source.id,
  );

  if (options.selectedSourceId) {
    const selectedSource = savedSourcesById[options.selectedSourceId];

    if (selectedSource) {
      return createTrackPlayableItem(selectedSource);
    }
  }

  return null;
};

export const hydrateLoopBuilderTrackDuration = (
  selectedTrack: PlayableItem | null,
  durationMs: number | null | undefined,
) => {
  if (
    !selectedTrack ||
    selectedTrack.kind !== 'track' ||
    durationMs === null ||
    durationMs === undefined ||
    selectedTrack.source.durationMs === durationMs
  ) {
    return selectedTrack;
  }

  return createTrackPlayableItem(
    {
      ...selectedTrack.source,
      durationMs,
    },
    selectedTrack.playlistId,
    selectedTrack.playlistEntryId,
  );
};

export const resolveLoopBuilderTrackDuration = (
  options: ResolveLoopBuilderTrackDurationOptions,
) => {
  if (!options.selectedTrack || options.selectedTrack.kind !== 'track') {
    return null;
  }

  if (
    options.resolvedDurationMs !== null &&
    options.resolvedDurationMs !== undefined
  ) {
    return options.resolvedDurationMs;
  }

  if (options.selectedTrack.source.durationMs !== undefined) {
    return options.selectedTrack.source.durationMs;
  }

  if (
    options.activePlayableItem?.kind !== 'track' ||
    options.activePlayableItem.sourceId !== options.selectedTrack.sourceId ||
    options.playbackDurationSeconds <= 0
  ) {
    return null;
  }

  return Math.round(options.playbackDurationSeconds * 1000);
};

export const resolveSourcesMissingLoopBuilderDuration = (
  options: ResolveSourcesMissingLoopBuilderDurationOptions,
) => {
  const sourcesMissingDuration: DriveLibrarySource[] = [];

  for (const source of options.savedSources) {
    if (source.durationMs !== undefined) {
      continue;
    }

    const resolvedDurationMs = options.resolvedDurationsBySourceId[source.id];

    if (resolvedDurationMs === undefined) {
      sourcesMissingDuration.push(source);
      continue;
    }

    if (options.retryFailedLookup && resolvedDurationMs === null) {
      sourcesMissingDuration.push(source);
    }
  }

  return sourcesMissingDuration;
};

export const resolveLoopBuilderRangeSelection = (
  options: ResolveLoopBuilderRangeSelectionOptions,
) => {
  const sliderValues = Array.isArray(options.sliderValue)
    ? options.sliderValue
    : [0, options.sliderValue];
  const [rawStartSeconds = 0, rawEndSeconds = 0] = sliderValues;
  const normalizedStartMs = Math.round(
    Math.min(rawStartSeconds, rawEndSeconds) * 1000,
  );
  const normalizedEndMs = Math.round(
    Math.max(rawStartSeconds, rawEndSeconds) * 1000,
  );
  const validation = validateLoopRange(
    normalizedStartMs,
    normalizedEndMs,
    options.durationMs,
  );

  return {
    endMs: validation.normalizedEndMs,
    startMs: validation.normalizedStartMs,
  };
};

export const createLoopPreviewPlayableItem = (options: {
  endMs: number;
  selectedTrack: PlayableItem;
  startMs: number;
}): PlayableItem => {
  const startLabel = formatDurationLabel(options.startMs) ?? '0:00';
  const endLabel = formatDurationLabel(options.endMs) ?? '0:00';

  return {
    id: `loop-preview:${options.selectedTrack.sourceId}:${options.startMs}:${options.endMs}`,
    kind: 'loop',
    title: `${options.selectedTrack.source.name} preview`,
    sourceId: options.selectedTrack.sourceId,
    source: options.selectedTrack.source,
    range: {
      startMs: options.startMs,
      endMs: options.endMs,
    },
    description: `Preview ${startLabel} to ${endLabel}`,
  };
};
