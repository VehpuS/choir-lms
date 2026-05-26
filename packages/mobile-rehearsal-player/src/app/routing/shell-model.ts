import type { PlayableItem } from '@org/audio-library-models';

import { formatDurationLabel } from '../library/utils/drive-library-view-model';
import {
  getPlaylistQueueModeLabel,
  getPlaylistRepeatModeLabel,
  getPlaylistPlaybackSessionSummary,
  resolvePlaylistPlaybackAdvance,
  type PlaylistPlaybackSession,
} from '../library/utils/saved-playlist-playback-view-model';
import type { SavedTrackPlaybackState } from '../library/utils/saved-track-playback-view-model';

export type ShellDestinationKey = 'home' | 'search' | 'library';

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
};

export type NowPlayingSurfaceSummary = {
  collectionLabel: string;
  playbackLabel: string;
  progressLabel: string;
  queueLabel: string;
  rangeLabel: string | null;
  statusLabel: string;
  title: string;
  upNextLabel: string | null;
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
    key: 'home',
    label: 'Home',
    title: 'Practice home base',
    description:
      'Start from Drive discovery, keep the Google connection visible, and stay close to the active rehearsal session without mixing in the full saved library.',
  },
  {
    key: 'search',
    label: 'Search',
    title: 'Search rehearsal audio',
    description:
      'Search across accessible rehearsal audio, scan results quickly, and save promising tracks into Library without leaving the result flow.',
  },
  {
    key: 'library',
    label: 'Library',
    title: 'Your rehearsal library',
    description:
      'Keep saved tracks and loops separate from discovery so personal practice material stays focused and playback actions remain close at hand.',
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
  const positionLabel =
    formatDurationLabel(Math.round(options.playbackPositionSeconds * 1000)) ??
    '0:00';
  const totalDurationMs =
    options.activePlayableItem.range.endMs ??
    options.activePlayableItem.source.durationMs;
  const durationLabel = formatDurationLabel(totalDurationMs);

  return durationLabel ? `${positionLabel} of ${durationLabel}` : positionLabel;
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
      : 'Keep the current rehearsal item audible while moving between Home, Search, and Library.',
    queueLabel: getPlaybackQueueLabel(options.activePlaylistSession),
    rangeLabel: getPlayableItemRangeLabel(options.activePlayableItem),
    upNextLabel: options.activePlaylistSession
      ? (resolvePlaylistPlaybackAdvance(options.activePlaylistSession)
          .nextPlayableItem?.title ?? null)
      : null,
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
