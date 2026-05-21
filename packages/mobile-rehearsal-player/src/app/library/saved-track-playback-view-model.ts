import {
  buildDriveMediaUrl,
  type DriveAuthorizationState,
} from '@org/google-drive';
import {
  createTrackPlayableItem,
  type PlayableItem,
} from '@org/rehearsal-domain';

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

type SavedTrackPlaybackActionOptions = {
  activePlayableItem: PlayableItem | null;
  isPreparing: boolean;
  playbackState: SavedTrackPlaybackState | undefined;
  source: DriveLibrarySource;
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
  source: DriveLibrarySource,
) => {
  return activePlayableItem?.sourceId === source.id;
};

export const createSavedTrackPlaybackPreconditionIssue = (
  authState: DriveAuthorizationState,
  source: DriveLibrarySource,
) => {
  if (source.availability.status !== 'available') {
    return {
      sourceId: source.id,
      title: 'Track unavailable',
      message: source.availability.message ?? DEFAULT_UNAVAILABLE_MESSAGE,
    } satisfies SavedTrackPlaybackIssue;
  }

  if (authState.status !== 'authorized' || !authState.accessToken) {
    return {
      sourceId: source.id,
      title: 'Google Drive access required',
      message: DRIVE_ACCESS_REQUIRED_MESSAGE,
    } satisfies SavedTrackPlaybackIssue;
  }

  return null;
};

export const createSavedTrackPlaybackRequest = (options: {
  accessToken: string;
  source: DriveLibrarySource;
}): SavedTrackPlaybackRequest => {
  const playableItem = createTrackPlayableItem(options.source);

  return {
    playableItem,
    track: {
      id: playableItem.id,
      url: buildDriveMediaUrl(options.source.driveFileId),
      title: playableItem.title,
      description: playableItem.description,
      duration:
        options.source.durationMs !== undefined
          ? options.source.durationMs / 1000
          : undefined,
      contentType: options.source.mimeType,
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
      },
    },
  };
};

export const createSavedTrackPlaybackRuntimeIssue = (
  source: DriveLibrarySource,
  error: unknown,
) => {
  const detail = error instanceof Error ? error.message.trim() : '';
  const fallbackMessage = `The saved rehearsal library could not play "${source.name}".`;

  return {
    sourceId: source.id,
    title: 'Playback failed',
    message: detail ? `${fallbackMessage} ${detail}` : fallbackMessage,
  } satisfies SavedTrackPlaybackIssue;
};

export const getSavedTrackPlaybackActionCopy = (
  options: SavedTrackPlaybackActionOptions,
) => {
  const isActiveSource = isSavedTrackPlaybackActive(
    options.activePlayableItem,
    options.source,
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

export const getSavedTrackPlaybackSourceIssue = (
  issue: SavedTrackPlaybackIssue | null,
  source: DriveLibrarySource,
) => {
  if (issue?.sourceId !== source.id) {
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
