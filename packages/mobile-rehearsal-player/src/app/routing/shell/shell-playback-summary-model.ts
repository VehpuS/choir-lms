import type { PlayableItem } from '@org/audio-library-models';

import { formatDurationLabel } from '../../library/drive/utils/drive-library-view-model';
import type { SavedTrackPlaybackState } from '../../library/playback/utils/saved-track-playback-view-model';
import {
  getPlaylistQueueModeLabel,
  getPlaylistRepeatModeLabel,
  type PlaylistPlaybackSession,
} from '../../library/playlists/utils/saved-playlist-playback-view-model';

export type MiniPlayerSummary = {
  accessibilityLabel: string;
  context: string;
  title: string;
  waveformProgressRatio: number;
};

export const getPlaybackStatusLabel = (options: {
  isPlaybackPreparing: boolean;
  playbackState: SavedTrackPlaybackState | undefined;
}) => {
  if (options.isPlaybackPreparing) {
    return 'Loading';
  }

  if (options.playbackState === 'playing') {
    return 'Playing';
  }

  if (options.playbackState === 'paused') {
    return 'Paused';
  }

  if (options.playbackState === 'ended') {
    return 'Ended';
  }

  if (options.playbackState === 'error') {
    return 'Needs attention';
  }

  return 'Ready';
};

export const getProgressLabel = (options: {
  activePlayableItem: PlayableItem;
  playbackPositionSeconds: number;
}) => {
  const rangeStartMs = options.activePlayableItem.range.startMs;
  const totalDurationMs =
    options.activePlayableItem.range.endMs ??
    options.activePlayableItem.source.durationMs;
  const boundedPositionMs = Math.max(
    rangeStartMs,
    Math.round(options.playbackPositionSeconds * 1000),
  );
  const clampedPositionMs =
    totalDurationMs === undefined
      ? boundedPositionMs
      : Math.min(boundedPositionMs, totalDurationMs);
  const relativePositionMs = Math.max(0, clampedPositionMs - rangeStartMs);
  const positionLabel = formatDurationLabel(relativePositionMs) ?? '0:00';
  const durationLabel = formatDurationLabel(
    totalDurationMs === undefined
      ? totalDurationMs
      : totalDurationMs - rangeStartMs,
  );

  return durationLabel ? `${positionLabel} of ${durationLabel}` : positionLabel;
};

export const getPlaybackProgressRatio = (options: {
  activePlayableItem: PlayableItem;
  playbackPositionSeconds: number;
}) => {
  const startSeconds = options.activePlayableItem.range.startMs / 1000;
  const rangeEndMs =
    options.activePlayableItem.range.endMs ??
    options.activePlayableItem.source.durationMs;

  if (rangeEndMs === undefined) {
    return 0;
  }

  const durationSeconds = rangeEndMs / 1000 - startSeconds;

  if (durationSeconds <= 0) {
    return 0;
  }

  return Math.min(
    1,
    Math.max(
      0,
      (options.playbackPositionSeconds - startSeconds) / durationSeconds,
    ),
  );
};

export const getPlaybackCollectionLabel = (options: {
  activePlayableItem: PlayableItem;
  activePlaylistSession?: PlaylistPlaybackSession | null;
}) => {
  if (!options.activePlaylistSession) {
    return options.activePlayableItem.kind === 'loop'
      ? `Saved loop from ${options.activePlayableItem.source.name}`
      : 'Saved rehearsal library';
  }

  const queueItemCount = options.activePlaylistSession.queue.items.length;
  const itemPosition = Math.min(
    options.activePlaylistSession.currentIndex + 1,
    queueItemCount,
  );

  return `${options.activePlaylistSession.playlistName} • Item ${itemPosition} of ${queueItemCount}`;
};

export const getPlayableItemRangeLabel = (playableItem: PlayableItem) => {
  if (playableItem.kind !== 'loop' || playableItem.range.endMs === null) {
    return null;
  }

  const startLabel = formatDurationLabel(playableItem.range.startMs) ?? '0:00';
  const endLabel = formatDurationLabel(playableItem.range.endMs) ?? '0:00';

  return `Loop ${startLabel} - ${endLabel}`;
};

const getPlaybackQueueLabel = (
  activePlaylistSession?: PlaylistPlaybackSession | null,
) => {
  if (!activePlaylistSession) {
    return 'Single item playback';
  }

  return `${getPlaylistQueueModeLabel(activePlaylistSession.queue.mode)} • ${getPlaylistRepeatModeLabel(activePlaylistSession.queue.repeatMode)}`;
};

const getMiniPlayerContextLabel = (options: {
  activePlayableItem: PlayableItem;
  activePlaylistSession?: PlaylistPlaybackSession | null;
  progressLabel: string;
  status: string;
}) => {
  if (options.activePlaylistSession) {
    const itemCount = options.activePlaylistSession.queue.items.length;
    const itemPosition = Math.min(
      options.activePlaylistSession.currentIndex + 1,
      itemCount,
    );

    return `${options.status} • ${options.activePlaylistSession.playlistName} • ${itemPosition} of ${itemCount}`;
  }

  if (options.activePlayableItem.kind === 'loop') {
    const normalizedTitle =
      options.activePlayableItem.title.toLocaleLowerCase();
    const normalizedSourceName =
      options.activePlayableItem.source.name.toLocaleLowerCase();

    if (normalizedTitle.includes(normalizedSourceName)) {
      return `${options.status} • Saved loop`;
    }

    return `${options.status} • Loop from ${options.activePlayableItem.source.name}`;
  }

  return `${options.status} • ${options.progressLabel}`;
};

export const getQueueItemDetail = (playableItem: PlayableItem) => {
  const loopLabel = getPlayableItemRangeLabel(playableItem);

  if (loopLabel) {
    return `${loopLabel} • ${playableItem.source.name}`;
  }

  const durationLabel = formatDurationLabel(playableItem.source.durationMs);

  return durationLabel ? `Full track • ${durationLabel}` : 'Full track';
};

export const getMiniPlayerSummary = (options: {
  activePlayableItem: PlayableItem | null;
  activePlaylistSession?: PlaylistPlaybackSession | null;
  isPlaybackPreparing: boolean;
  playbackPositionSeconds: number;
  playbackState: SavedTrackPlaybackState | undefined;
}): MiniPlayerSummary | null => {
  if (!options.activePlayableItem) {
    return null;
  }

  const status = getPlaybackStatusLabel(options);
  const progressLabel = getProgressLabel({
    activePlayableItem: options.activePlayableItem,
    playbackPositionSeconds: options.playbackPositionSeconds,
  });
  const collectionLabel = getPlaybackCollectionLabel({
    activePlayableItem: options.activePlayableItem,
    activePlaylistSession: options.activePlaylistSession,
  });
  const queueLabel = getPlaybackQueueLabel(options.activePlaylistSession);
  const loopLabel = getPlayableItemRangeLabel(options.activePlayableItem);
  const accessibilityDetail = compactDetailLabels([
    `${status} • ${progressLabel}`,
    collectionLabel,
    queueLabel,
    loopLabel,
  ]);

  return {
    accessibilityLabel: `Now playing: ${options.activePlayableItem.title}. ${accessibilityDetail}`,
    context: getMiniPlayerContextLabel({
      activePlayableItem: options.activePlayableItem,
      activePlaylistSession: options.activePlaylistSession,
      progressLabel,
      status,
    }),
    title: options.activePlayableItem.title,
    waveformProgressRatio: getPlaybackProgressRatio({
      activePlayableItem: options.activePlayableItem,
      playbackPositionSeconds: options.playbackPositionSeconds,
    }),
  };
};

const compactDetailLabels = (labels: Array<string | null>) => {
  return labels.filter((label): label is string => Boolean(label)).join(' • ');
};
