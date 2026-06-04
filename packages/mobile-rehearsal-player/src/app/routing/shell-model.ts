import type { PlayableItem } from '@org/audio-library-models';

import { formatDurationLabel } from '../library/utils/drive-library-view-model';
import {
  getPlaylistPlaybackSessionSummary,
  getPlaylistQueueModeLabel,
  getPlaylistRepeatModeLabel,
  resolvePlaylistPlaybackAdvance,
  type PlaylistPlaybackSession,
} from '../library/utils/saved-playlist-playback-view-model';
import type { SavedTrackPlaybackState } from '../library/utils/saved-track-playback-view-model';

export type ShellDestinationKey = 'recents' | 'add' | 'library';

export type ShellDestination = {
  description: string;
  key: ShellDestinationKey;
  label: string;
  title: string;
};

export type MiniPlayerSummary = {
  detail: string;
  status: string;
  title: string;
  waveformProgressRatio: number;
};

export type NowPlayingSurfaceSummary = {
  collectionLabel: string;
  playbackLabel: string;
  progressLabel: string;
  queueLabel: string;
  queuePlaylistActions: {
    saveLabel: string;
    updateLabel: string;
  } | null;
  rangeLabel: string | null;
  statusLabel: string;
  supportsQueueNavigation: boolean;
  title: string;
  upNextLabel: string | null;
  waveformProgressRatio: number;
};

export type UpNextSurfaceItem = {
  detail: string;
  isCurrent: boolean;
  key: string;
  title: string;
};

export type UpNextSurfaceSummary = {
  collectionLabel: string;
  items: UpNextSurfaceItem[];
  queueLabel: string;
};

export const SHELL_DESTINATIONS: ShellDestination[] = [
  {
    key: 'library',
    label: 'Library',
    title: 'Your rehearsal library',
    description: 'Play saved tracks, loops, and playlists.',
  },
  {
    key: 'add',
    label: 'Add',
    title: 'Add from Google Drive',
    description: 'Browse and search Google Drive folders and tracks to add.',
  },
  {
    key: 'recents',
    label: 'Recents',
    title: 'Recent rehearsal shortcuts',
    description:
      'Resume current playback and jump back into recent practice context.',
  },
];

const getPlaybackStatusLabel = (options: {
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

const getProgressLabel = (options: {
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

const getPlaybackCollectionLabel = (options: {
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

const getPlayableItemRangeLabel = (playableItem: PlayableItem) => {
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

const getQueueItemDetail = (playableItem: PlayableItem) => {
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

  return {
    title: options.activePlayableItem.title,
    status: `${status} • ${progressLabel}`,
    detail: compactDetailLabels([collectionLabel, queueLabel, loopLabel]),
    waveformProgressRatio: getPlaybackProgressRatio({
      activePlayableItem: options.activePlayableItem,
      playbackPositionSeconds: options.playbackPositionSeconds,
    }),
  };
};

const compactDetailLabels = (labels: Array<string | null>) => {
  return labels.filter((label): label is string => Boolean(label)).join(' • ');
};

export const getNowPlayingSurfaceSummary = (options: {
  activePlayableItem: PlayableItem | null;
  activePlaylistSession?: PlaylistPlaybackSession | null;
  isPlaybackPreparing: boolean;
  playbackPositionSeconds: number;
  playbackState: SavedTrackPlaybackState | undefined;
}): NowPlayingSurfaceSummary | null => {
  if (!options.activePlayableItem) {
    return null;
  }

  return {
    title: options.activePlayableItem.title,
    statusLabel: getPlaybackStatusLabel(options),
    progressLabel: getProgressLabel({
      activePlayableItem: options.activePlayableItem,
      playbackPositionSeconds: options.playbackPositionSeconds,
    }),
    collectionLabel: getPlaybackCollectionLabel({
      activePlayableItem: options.activePlayableItem,
      activePlaylistSession: options.activePlaylistSession,
    }),
    playbackLabel: options.activePlaylistSession
      ? getPlaylistPlaybackSessionSummary(options.activePlaylistSession)
      : 'Keep the current rehearsal item audible while moving between Library, Add, and Recents.',
    queueLabel: getPlaybackQueueLabel(options.activePlaylistSession),
    queuePlaylistActions: options.activePlaylistSession
      ? {
          saveLabel: 'Create new playlist',
          updateLabel: 'Update playlist',
        }
      : null,
    rangeLabel: getPlayableItemRangeLabel(options.activePlayableItem),
    supportsQueueNavigation: Boolean(options.activePlaylistSession),
    upNextLabel: options.activePlaylistSession
      ? (resolvePlaylistPlaybackAdvance(options.activePlaylistSession)
          .nextPlayableItem?.title ?? null)
      : null,
    waveformProgressRatio: getPlaybackProgressRatio({
      activePlayableItem: options.activePlayableItem,
      playbackPositionSeconds: options.playbackPositionSeconds,
    }),
  };
};

export const getUpNextSurfaceSummary = (options: {
  activePlaylistSession?: PlaylistPlaybackSession | null;
}): UpNextSurfaceSummary | null => {
  if (!options.activePlaylistSession) {
    return null;
  }

  return {
    collectionLabel: `${options.activePlaylistSession.playlistName} • ${getPlaylistPlaybackSessionSummary(options.activePlaylistSession)}`,
    queueLabel: getPlaybackQueueLabel(options.activePlaylistSession),
    items: options.activePlaylistSession.queue.items.map((item, index) => {
      return {
        title: item.title,
        detail: getQueueItemDetail(item),
        isCurrent: index === options.activePlaylistSession?.currentIndex,
        key: item.playlistEntryId ?? `${item.id}:${index}`,
      };
    }),
  };
};
