import {
  createLoopPlayableItem,
  createTrackPlayableItem,
  type NamedLoop,
  type PlayableItem,
} from '@org/audio-library-models';
import {
  buildDriveMediaUrl,
  type DriveAuthorizationState,
} from '@org/google-drive';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { SavedTrackPlaybackIssue } from './saved-track-playback-presentation';
export {
  getSavedTrackPlaybackActionCopy,
  getSavedTrackPlaybackItemIssue,
  getSavedTrackPlaybackStatusCopy,
  isSavedTrackPlaybackActive,
  isSavedTrackPlaybackBusy,
} from './saved-track-playback-presentation';
export type {
  SavedTrackPlaybackIssue,
  SavedTrackPlaybackState,
} from './saved-track-playback-presentation';
export {
  hasSavedTrackPlaybackReachedRangeEnd,
  hydratePlayableItemDuration,
  normalizePlaybackVolumeLevel,
  resolvePlaybackScrubPositionSeconds,
  resolvePlaybackSeekPositionSeconds,
  shouldRepeatSingleItemPlayback,
} from './saved-track-playback-timeline';

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

type ResolveSynchronizedPlayableItemOptions = {
  loops: NamedLoop[];
  playableItem: PlayableItem | null;
  sources: DriveLibrarySource[];
};

const DEFAULT_UNAVAILABLE_MESSAGE =
  'This saved rehearsal track is not currently available for playback.';
const DRIVE_ACCESS_REQUIRED_MESSAGE =
  'Reconnect Google Drive before starting full-track playback from the saved rehearsal library.';
const DRIVE_PLAYBACK_CONTINUE_REQUIRED_MESSAGE =
  'Reconnect Google Drive before saved-library playback can continue.';
const TRACK_PLAYER_ALREADY_INITIALIZED_CODE = 'player_already_initialized';
const TRACK_PLAYER_ALREADY_INITIALIZED_MESSAGE =
  'already been initialized via setupPlayer';

const getTrackPlayerPlayableItemId = (playableItem: PlayableItem) => {
  return playableItem.playlistEntryId
    ? `${playableItem.id}:${playableItem.playlistEntryId}`
    : playableItem.id;
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

export const resolveSynchronizedPlayableItem = (
  options: ResolveSynchronizedPlayableItemOptions,
) => {
  if (!options.playableItem) {
    return null;
  }

  const nextSource = options.sources.find((source) => {
    return source.id === options.playableItem?.sourceId;
  });

  if (!nextSource) {
    return options.playableItem;
  }

  if (options.playableItem.kind === 'track') {
    return createTrackPlayableItem(
      nextSource,
      options.playableItem.playlistId,
      options.playableItem.playlistEntryId,
    );
  }

  const nextLoop = options.loops.find((loop) => {
    return loop.id === options.playableItem?.loopId;
  });

  if (!nextLoop) {
    return options.playableItem;
  }

  return createLoopPlayableItem(
    nextLoop,
    nextSource,
    options.playableItem.playlistId,
    options.playableItem.playlistEntryId,
  );
};

export const hasPlayableItemChanged = (
  currentPlayableItem: PlayableItem | null,
  nextPlayableItem: PlayableItem | null,
) => {
  if (currentPlayableItem === nextPlayableItem) {
    return false;
  }

  if (!currentPlayableItem || !nextPlayableItem) {
    return currentPlayableItem !== nextPlayableItem;
  }

  return (
    currentPlayableItem.id !== nextPlayableItem.id ||
    currentPlayableItem.kind !== nextPlayableItem.kind ||
    currentPlayableItem.title !== nextPlayableItem.title ||
    currentPlayableItem.description !== nextPlayableItem.description ||
    currentPlayableItem.loopId !== nextPlayableItem.loopId ||
    currentPlayableItem.playlistEntryId !== nextPlayableItem.playlistEntryId ||
    currentPlayableItem.playlistId !== nextPlayableItem.playlistId ||
    currentPlayableItem.source.id !== nextPlayableItem.source.id ||
    currentPlayableItem.source.name !== nextPlayableItem.source.name ||
    currentPlayableItem.source.durationMs !==
      nextPlayableItem.source.durationMs ||
    currentPlayableItem.range.startMs !== nextPlayableItem.range.startMs ||
    currentPlayableItem.range.endMs !== nextPlayableItem.range.endMs
  );
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

export const createSavedTrackPlaybackAuthorizationIssue = (
  issue: Pick<
    SavedTrackPlaybackIssue,
    'playableItemId' | 'playlistId' | 'sourceId'
  >,
) => {
  return {
    ...issue,
    title: 'Google Drive access required',
    message: DRIVE_PLAYBACK_CONTINUE_REQUIRED_MESSAGE,
  } satisfies SavedTrackPlaybackIssue;
};
