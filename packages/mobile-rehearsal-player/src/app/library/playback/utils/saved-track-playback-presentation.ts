import type { PlayableItem } from '@org/audio-library-models';

import {
  formatDurationLabel,
  type DriveLibraryStatusCopy,
} from '../../drive/utils/drive-library-view-model';

export type SavedTrackPlaybackState =
  | 'buffering'
  | 'ended'
  | 'error'
  | 'loading'
  | 'none'
  | 'paused'
  | 'playing'
  | 'ready'
  | 'stopped';

export type SavedTrackPlaybackIssue = {
  playlistId?: string;
  playableItemId?: string;
  sourceId?: string;
  title: string;
  message: string;
};

type SavedTrackPlaybackActionOptions = {
  activePlayableItem: PlayableItem | null;
  isPreparing: boolean;
  playableItem: PlayableItem;
  playbackState: SavedTrackPlaybackState | undefined;
};

type SavedTrackPlaybackStatusOptions = {
  activePlayableItem: PlayableItem | null;
  durationSeconds: number;
  isPreparing: boolean;
  issue: SavedTrackPlaybackIssue | null;
  playbackState: SavedTrackPlaybackState | undefined;
  positionSeconds: number;
};

const isLoadingState = (playbackState: SavedTrackPlaybackState | undefined) => {
  return playbackState === 'loading' || playbackState === 'buffering';
};

const getPlaybackSummary = (
  activePlayableItem: PlayableItem,
  positionSeconds: number,
  durationSeconds: number,
) => {
  const positionMs = Math.max(0, Math.round(positionSeconds * 1000));
  const fallbackDurationMs =
    activePlayableItem.range.endMs ?? activePlayableItem.source.durationMs;
  const resolvedDurationMs =
    durationSeconds > 0
      ? Math.round(durationSeconds * 1000)
      : fallbackDurationMs;
  const positionLabel = formatDurationLabel(positionMs) ?? '0:00';
  const durationLabel = resolvedDurationMs
    ? formatDurationLabel(resolvedDurationMs)
    : undefined;

  return durationLabel ? `${positionLabel} of ${durationLabel}` : positionLabel;
};

export const isSavedTrackPlaybackBusy = (options: {
  isPreparing: boolean;
  playbackState: SavedTrackPlaybackState | undefined;
}) => {
  return options.isPreparing || isLoadingState(options.playbackState);
};

export const isSavedTrackPlaybackActive = (
  activePlayableItem: PlayableItem | null,
  playableItem: PlayableItem,
) => {
  return activePlayableItem?.id === playableItem.id;
};

export const getSavedTrackPlaybackActionCopy = (
  options: SavedTrackPlaybackActionOptions,
) => {
  const isActiveSource = isSavedTrackPlaybackActive(
    options.activePlayableItem,
    options.playableItem,
  );

  if (!isActiveSource) {
    return {
      disabled: options.isPreparing,
      label: 'Play',
    };
  }

  if (isSavedTrackPlaybackBusy(options)) {
    return {
      disabled: true,
      label: 'Loading…',
    };
  }

  if (options.playbackState === 'playing') {
    return {
      disabled: false,
      label: 'Pause',
    };
  }

  if (
    options.playbackState === 'paused' ||
    options.playbackState === 'ready' ||
    options.playbackState === 'stopped'
  ) {
    return {
      disabled: false,
      label: 'Resume',
    };
  }

  if (options.playbackState === 'ended') {
    return {
      disabled: false,
      label: 'Replay',
    };
  }

  if (options.playbackState === 'error') {
    return {
      disabled: false,
      label: 'Retry',
    };
  }

  return {
    disabled: false,
    label: 'Play',
  };
};

export const getSavedTrackPlaybackItemIssue = (
  issue: SavedTrackPlaybackIssue | null,
  playableItem: PlayableItem,
) => {
  if (issue?.playableItemId !== playableItem.id) {
    return undefined;
  }

  return issue.message;
};

export const getSavedTrackPlaybackStatusCopy = (
  options: SavedTrackPlaybackStatusOptions,
): DriveLibraryStatusCopy | null => {
  if (options.issue) {
    return {
      title: options.issue.title,
      message: options.issue.message,
      tone: 'error',
    };
  }

  if (!options.activePlayableItem) {
    return null;
  }

  if (isSavedTrackPlaybackBusy(options)) {
    return {
      title: 'Preparing playback',
      message: `Loading ${options.activePlayableItem.title} from the saved rehearsal library.`,
      tone: 'neutral',
    };
  }

  if (options.playbackState === 'playing') {
    return {
      title: 'Now playing',
      message: `${options.activePlayableItem.title} • ${getPlaybackSummary(options.activePlayableItem, options.positionSeconds, options.durationSeconds)}.`,
      tone: 'ready',
    };
  }

  if (
    options.playbackState === 'paused' ||
    options.playbackState === 'ready' ||
    options.playbackState === 'stopped'
  ) {
    return {
      title: 'Playback paused',
      message: `${options.activePlayableItem.title} • paused at ${getPlaybackSummary(options.activePlayableItem, options.positionSeconds, options.durationSeconds)}.`,
      tone: 'neutral',
    };
  }

  if (options.playbackState === 'ended') {
    return {
      title: 'Track finished',
      message: `Replay ${options.activePlayableItem.title} from the beginning of the saved rehearsal track.`,
      tone: 'ready',
    };
  }

  if (options.playbackState === 'error') {
    return {
      title: 'Playback failed',
      message: `Try playing ${options.activePlayableItem.title} again from the saved rehearsal library.`,
      tone: 'error',
    };
  }

  return {
    title: 'Track ready',
    message: `${options.activePlayableItem.title} is ready for full-track playback from the saved rehearsal library.`,
    tone: 'neutral',
  };
};
