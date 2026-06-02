import {
  createLoopPlayableItem,
  type NamedLoop,
  validateLoopRange,
} from '@org/audio-library-models';
import { keyBy } from 'es-toolkit/compat';

import type {
  DriveLibrarySource,
  DriveLibraryStatusCopy,
} from './drive-library-view-model';
import { formatDurationLabel } from './drive-library-view-model';

export {
  createLoopPreviewPlayableItem,
  hydrateLoopBuilderTrackDuration,
  resolveLoopBuilderRangeSelection,
  resolveSourcesMissingLoopBuilderDuration,
  resolveLoopBuilderTrack,
  resolveLoopBuilderTrackDuration,
} from './saved-loop-builder-view-model';

export type SavedLoopIssue = {
  kind: 'delete' | 'save' | 'storage';
  title: string;
  message: string;
  loopId?: string;
};

export type SavedLoopRemovalCopy = {
  confirmLabel: string;
  message: string;
  title: string;
};

export type SavedLoopCard = {
  loop: NamedLoop;
  metadataLabel: string;
  message?: string;
  playableItem: ReturnType<typeof createLoopPlayableItem> | null;
};

export type LoopBuilderDraft = {
  endMs: number;
  loopName: string;
  startMs: number;
  suggestedLoopName: string;
};

type BuildNamedLoopOptions = {
  createId?: (sourceId: string, createdAt: string) => string;
  endMs: number | null;
  loopName: string;
  now?: string;
  ownerId: string;
  source: DriveLibrarySource;
  startMs: number | null;
};

type DefaultLoopNameOptions = {
  endMs: number;
  sourceName: string;
  startMs: number;
};

type UpdateLoopBuilderDraftRangeOptions = {
  draft: LoopBuilderDraft;
  endMs: number;
  sourceName: string;
  startMs: number;
};

type SavedLoopStatusOptions = {
  isLoading: boolean;
  issue: SavedLoopIssue | null;
  savedLoopCount: number;
  unresolvedLoopCount: number;
};

const DEFAULT_UNAVAILABLE_LOOP_MESSAGE =
  'This saved loop is not currently available for playback.';
const LOOP_MARKERS_REQUIRED_ISSUE = {
  title: 'Loop markers required',
  message:
    'Set both the start and end markers on the active saved track before saving a loop.',
};
const LOOP_NAME_REQUIRED_ISSUE = {
  title: 'Loop name required',
  message: 'Provide a loop name before saving this practice segment.',
};
const MISSING_SOURCE_MESSAGE =
  'Restore the saved source track in the rehearsal library before playing this loop.';

const formatLoopRangeLabel = (loop: Pick<NamedLoop, 'startMs' | 'endMs'>) => {
  const startLabel = formatDurationLabel(loop.startMs) ?? '0:00';
  const endLabel = formatDurationLabel(loop.endMs) ?? '0:00';

  return `${startLabel} to ${endLabel}`;
};

const formatLoopNameRangeLabel = (
  loop: Pick<DefaultLoopNameOptions, 'startMs' | 'endMs'>,
) => {
  const startLabel = formatDurationLabel(loop.startMs) ?? '0:00';
  const endLabel = formatDurationLabel(loop.endMs) ?? '0:00';

  return `${startLabel} - ${endLabel}`;
};

const defaultCreateId = (sourceId: string, createdAt: string) => {
  return `loop:${sourceId}:${createdAt}`;
};

export const getSavedLoopRemovalCopy = (
  loop: Pick<NamedLoop, 'name' | 'sourceName' | 'startMs' | 'endMs'>,
): SavedLoopRemovalCopy => {
  return {
    confirmLabel: 'Remove loop',
    message:
      `"${loop.name}" (${loop.sourceName} • ${formatLoopRangeLabel(loop)}) ` +
      'will be removed from your saved practice loops.',
    title: 'Remove saved loop?',
  };
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

export const buildNamedLoop = (options: BuildNamedLoopOptions) => {
  const trimmedLoopName = options.loopName.trim();

  if (!trimmedLoopName) {
    return {
      issue: LOOP_NAME_REQUIRED_ISSUE,
      loop: null,
    };
  }

  if (options.startMs === null || options.endMs === null) {
    return {
      issue: LOOP_MARKERS_REQUIRED_ISSUE,
      loop: null,
    };
  }

  const validation = validateLoopRange(
    options.startMs,
    options.endMs,
    options.source.durationMs,
  );

  if (!validation.isValid) {
    return {
      issue: {
        title: 'Invalid loop range',
        message:
          validation.error ??
          'Adjust the selected loop markers before saving this practice segment.',
      },
      loop: null,
    };
  }

  const createdAt = options.now ?? new Date().toISOString();

  return {
    issue: null,
    loop: {
      id:
        options.createId?.(options.source.id, createdAt) ??
        defaultCreateId(options.source.id, createdAt),
      name: trimmedLoopName,
      sourceId: options.source.id,
      sourceName: options.source.name,
      startMs: validation.normalizedStartMs,
      endMs: validation.normalizedEndMs,
      ownershipScope: 'user' as const,
      ownerId: options.ownerId,
      createdAt,
      updatedAt: createdAt,
    },
  };
};

export const resolveSavedLoopCards = (
  savedLoops: NamedLoop[],
  savedSources: DriveLibrarySource[],
) => {
  const savedSourcesById: Partial<Record<string, DriveLibrarySource>> = keyBy(
    savedSources,
    (source) => source.id,
  );

  return savedLoops.map((loop) => {
    const source = savedSourcesById[loop.sourceId];

    if (!source) {
      return {
        loop,
        metadataLabel: `${loop.sourceName} • ${formatLoopRangeLabel(loop)}`,
        message: MISSING_SOURCE_MESSAGE,
        playableItem: null,
      } satisfies SavedLoopCard;
    }

    return {
      loop,
      metadataLabel: `${source.name} • ${formatLoopRangeLabel(loop)}`,
      message:
        source.availability.status === 'available'
          ? undefined
          : (source.availability.message ?? DEFAULT_UNAVAILABLE_LOOP_MESSAGE),
      playableItem: createLoopPlayableItem(loop, source),
    } satisfies SavedLoopCard;
  });
};

export const getSavedLoopItemIssue = (
  issue: SavedLoopIssue | null,
  loopId: string,
) => {
  if (issue?.kind !== 'delete') {
    return undefined;
  }

  if (issue.loopId !== loopId) {
    return undefined;
  }

  return issue.message;
};

export const getSavedLoopsStatusCopy = (
  options: SavedLoopStatusOptions,
): DriveLibraryStatusCopy => {
  if (options.issue?.kind === 'storage') {
    return {
      title: options.issue.title,
      message: options.issue.message,
      tone: 'error',
    };
  }

  if (options.isLoading && options.savedLoopCount === 0) {
    return {
      title: 'Loading saved loops',
      message: 'Reading saved practice segments stored on this device.',
      tone: 'neutral',
    };
  }

  if (options.savedLoopCount === 0) {
    return {
      title: 'No saved loops yet',
      message:
        'Choose Make loop on a saved rehearsal track, adjust the loop range, and save the segment for direct playback.',
      tone: 'neutral',
    };
  }

  if (options.unresolvedLoopCount === 0) {
    return {
      title: 'Saved loops ready',
      message: `${options.savedLoopCount} saved loop${options.savedLoopCount === 1 ? '' : 's'} available for direct playback and playlist use.`,
      tone: 'ready',
    };
  }

  return {
    title: 'Saved loops need attention',
    message: `${options.savedLoopCount - options.unresolvedLoopCount} ready, with ${options.unresolvedLoopCount} saved loop${options.unresolvedLoopCount === 1 ? '' : 's'} awaiting source access or restoration.`,
    tone: 'warning',
  };
};
