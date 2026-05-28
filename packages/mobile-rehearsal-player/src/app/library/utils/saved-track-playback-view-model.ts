import {
  buildDriveMediaUrl,
  type DriveAuthorizationState,
} from '@org/google-drive';
import { type PlayableItem, type RepeatMode } from '@org/audio-library-models';

import {
  formatDurationLabel,
  type DriveLibrarySource,
  type DriveLibraryStatusCopy,
} from './drive-library-view-model';

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

export type SavedTrackPlayerTrack = {
  id: string;
  url: string;
  title: string;
  description?: string;
  duration?: number;
  contentType?: string;
  headers: Record<string, string>;
};

export type SavedTrackPlaybackRequest = {
  playableItem: PlayableItem;
  track: SavedTrackPlayerTrack;
};

type TrackPlayerSetupError = {
  code?: string;
  message?: string;
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

const DEFAULT_UNAVAILABLE_MESSAGE =
  'This saved rehearsal track is not currently available for playback.';
const DRIVE_ACCESS_REQUIRED_MESSAGE =
  'Reconnect Google Drive before starting full-track playback from the saved rehearsal library.';
const LOOP_RANGE_END_TOLERANCE_MS = 250;
const TRACK_PLAYER_ALREADY_INITIALIZED_CODE = 'player_already_initialized';
const TRACK_PLAYER_ALREADY_INITIALIZED_MESSAGE =
  'already been initialized via setupPlayer';
const DEFAULT_PLAYBACK_VOLUME_LEVEL = 1;

const getTrackPlayerPlayableItemId = (playableItem: PlayableItem) => {
  return playableItem.playlistEntryId
    ? `${playableItem.id}:${playableItem.playlistEntryId}`
    : playableItem.id;
};

const isLoadingState = (playbackState: SavedTrackPlaybackState | undefined) => {
  return playbackState === 'loading' || playbackState === 'buffering';
};

export const isTrackPlayerAlreadyInitializedError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const trackPlayerSetupError = error as TrackPlayerSetupError;

  return (
    trackPlayerSetupError.code === TRACK_PLAYER_ALREADY_INITIALIZED_CODE ||
    trackPlayerSetupError.message?.includes(
      TRACK_PLAYER_ALREADY_INITIALIZED_MESSAGE,
    ) === true
  );
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

export const hasSavedTrackPlaybackReachedRangeEnd = (options: {
  activePlayableItem: PlayableItem | null;
  playbackState: SavedTrackPlaybackState | undefined;
  positionSeconds: number;
}) => {
  if (
    options.activePlayableItem?.kind !== 'loop' ||
    options.playbackState !== 'playing' ||
    options.activePlayableItem.range.endMs === null
  ) {
    return false;
  }

  return (
    Math.round(options.positionSeconds * 1000) >=
    options.activePlayableItem.range.endMs - LOOP_RANGE_END_TOLERANCE_MS
  );
};

export const resolvePlaybackSeekPositionSeconds = (options: {
  activePlayableItem: PlayableItem;
  currentPositionSeconds: number;
  deltaSeconds: number;
}) => {
  return resolvePlaybackScrubPositionSeconds({
    activePlayableItem: options.activePlayableItem,
    requestedPositionSeconds:
      options.currentPositionSeconds + options.deltaSeconds,
  });
};

export const resolvePlaybackScrubPositionSeconds = (options: {
  activePlayableItem: PlayableItem;
  requestedPositionSeconds: number;
}) => {
  const minPositionSeconds = options.activePlayableItem.range.startMs / 1000;
  const rangeEndMs =
    options.activePlayableItem.range.endMs ??
    options.activePlayableItem.source.durationMs;
  const boundedPositionSeconds = Math.max(
    minPositionSeconds,
    options.requestedPositionSeconds,
  );

  if (rangeEndMs === undefined) {
    return boundedPositionSeconds;
  }

  return Math.min(boundedPositionSeconds, rangeEndMs / 1000);
};

export const normalizePlaybackVolumeLevel = (volumeLevel: number) => {
  if (!Number.isFinite(volumeLevel)) {
    return DEFAULT_PLAYBACK_VOLUME_LEVEL;
  }

  return Math.min(1, Math.max(0, volumeLevel));
};

export const shouldRepeatSingleItemPlayback = (repeatMode: RepeatMode) => {
  return repeatMode === 'one';
};

export const isSavedTrackPlaybackActive = (
  activePlayableItem: PlayableItem | null,
  playableItem: PlayableItem,
) => {
  return activePlayableItem?.id === playableItem.id;
};

export const createSavedTrackPlaybackPreconditionIssue = (
  authState: DriveAuthorizationState,
  playableItem: PlayableItem,
) => {
  const { source } = playableItem;

  if (source.availability.status !== 'available') {
    return {
      playableItemId: playableItem.id,
      sourceId: source.id,
      title: 'Track unavailable',
      message: source.availability.message ?? DEFAULT_UNAVAILABLE_MESSAGE,
    } satisfies SavedTrackPlaybackIssue;
  }

  if (authState.status !== 'authorized' || !authState.accessToken) {
    return {
      playableItemId: playableItem.id,
      sourceId: source.id,
      title: 'Google Drive access required',
      message: DRIVE_ACCESS_REQUIRED_MESSAGE,
    } satisfies SavedTrackPlaybackIssue;
  }

  return null;
};

export const createSavedTrackPlaybackRequest = (options: {
  accessToken: string;
  playableItem: PlayableItem;
}): SavedTrackPlaybackRequest => {
  const { playableItem } = options;

  return {
    playableItem,
    track: {
      id: getTrackPlayerPlayableItemId(playableItem),
      url: buildDriveMediaUrl(playableItem.source.driveFileId),
      title: playableItem.title,
      description: playableItem.description,
      duration:
        playableItem.source.durationMs !== undefined
          ? playableItem.source.durationMs / 1000
          : undefined,
      contentType: playableItem.source.mimeType,
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
      },
    },
  };
};

export const createSavedTrackPlaybackRuntimeIssue = (
  playableItem: PlayableItem,
  error: unknown,
) => {
  const detail = error instanceof Error ? error.message.trim() : '';
  const fallbackMessage = `The saved rehearsal library could not play "${playableItem.title}".`;

  return {
    playableItemId: playableItem.id,
    sourceId: playableItem.sourceId,
    title: 'Playback failed',
    message: detail ? `${fallbackMessage} ${detail}` : fallbackMessage,
  } satisfies SavedTrackPlaybackIssue;
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
