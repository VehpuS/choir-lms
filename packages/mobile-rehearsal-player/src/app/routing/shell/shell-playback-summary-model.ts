import {
  getPlaybackShapingLabelParts,
  type PlayableItem,
} from '@org/audio-library-models';
import { sum } from 'es-toolkit';

import { ROW_META_SEPARATOR } from '../../components/row-meta-line/model';
import { formatDurationLabel } from '../../library/drive/utils/drive-library-view-model';
import {
  formatSavedLoopRangeLabel,
  formatSavedLoopTimeRange,
} from '../../library/loops/utils/saved-loop-view-model';
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

/** The loop chip on the playback surface (1f): `0:12–0:18`, read as a loop. */
export const getPlayableItemLoopRange = (playableItem: PlayableItem) => {
  if (playableItem.kind !== 'loop' || playableItem.range.endMs === null) {
    return null;
  }

  const range = {
    endMs: playableItem.range.endMs,
    startMs: playableItem.range.startMs,
  };

  return {
    accessibilityLabel: `Loop ${formatSavedLoopRangeLabel(range)}`,
    label: formatSavedLoopTimeRange(range),
  };
};

const getPlaybackQueueLabel = (
  activePlaylistSession?: PlaylistPlaybackSession | null,
) => {
  if (!activePlaylistSession) {
    return 'Single item playback';
  }

  return `${getPlaylistQueueModeLabel(activePlaylistSession.queue.mode)} • ${getPlaylistRepeatModeLabel(activePlaylistSession.queue.repeatMode)}`;
};

/** The rehearsal context line's shaping tail (`• 0.90× · −2 st`), or nothing. */
const appendShapingLabel = (label: string, shapingLabel: string | null) => {
  return shapingLabel ? `${label} • ${shapingLabel}` : label;
};

const getMiniPlayerContextLabel = (options: {
  activePlayableItem: PlayableItem;
  activePlaylistSession?: PlaylistPlaybackSession | null;
  progressLabel: string;
  shapingLabel: string | null;
  status: string;
}) => {
  return appendShapingLabel(
    getMiniPlayerBaseContextLabel(options),
    options.shapingLabel,
  );
};

const getMiniPlayerBaseContextLabel = (options: {
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

/** An Up Next row's meta line (1h): `Track · 4:41` or `Loop · 1:12–1:48 · Kyrie.mp3`. */
export const getQueueItemDetail = (playableItem: PlayableItem) => {
  const loopRange = getPlayableItemLoopRange(playableItem);

  if (loopRange) {
    return ['Loop', loopRange.label, playableItem.source.name].join(
      ROW_META_SEPARATOR,
    );
  }

  const durationLabel = formatDurationLabel(playableItem.source.durationMs);

  return durationLabel ? `Track${ROW_META_SEPARATOR}${durationLabel}` : 'Track';
};

// The length an item plays for: its loop range, or the rest of its source.
const getPlayableItemDurationMs = (playableItem: PlayableItem) => {
  const endMs = playableItem.range.endMs ?? playableItem.source.durationMs;

  return endMs === undefined ? undefined : endMs - playableItem.range.startMs;
};

/**
 * The Up Next title block's line (1h): `9 items · 32:14 · ordered · repeat all`.
 * The total is left out rather than understated when an item has no duration.
 */
export const getQueueSessionMetaLabel = (session: PlaylistPlaybackSession) => {
  const itemCount = session.queue.items.length;
  const durations = session.queue.items.flatMap((item) => {
    return getPlayableItemDurationMs(item) ?? [];
  });
  const totalDurationLabel =
    durations.length === itemCount ? formatDurationLabel(sum(durations)) : null;
  const unavailableItemCount = Math.max(
    0,
    session.requestedItemCount - itemCount,
  );
  const parts = [
    `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`,
    totalDurationLabel,
    getPlaylistQueueModeLabel(session.queue.mode).toLowerCase(),
    getPlaylistRepeatModeLabel(session.queue.repeatMode).toLowerCase(),
    unavailableItemCount > 0 ? `${unavailableItemCount} unavailable` : null,
    session.hasCompleted ? 'finished' : null,
  ];

  return parts.filter((part) => part !== null).join(ROW_META_SEPARATOR);
};

export const getMiniPlayerSummary = (options: {
  activePlayableItem: PlayableItem | null;
  activePlaylistSession?: PlaylistPlaybackSession | null;
  isPlaybackPreparing: boolean;
  playbackPositionSeconds: number;
  playbackState: SavedTrackPlaybackState | undefined;
  /** Active speed and pitch, e.g. `0.90× · −2 st`; null when unshaped. */
  shapingLabel?: string | null;
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
    options.shapingLabel ?? null,
  ]);

  return {
    accessibilityLabel: `Now playing: ${options.activePlayableItem.title}. ${accessibilityDetail}`,
    context: getMiniPlayerContextLabel({
      activePlayableItem: options.activePlayableItem,
      activePlaylistSession: options.activePlaylistSession,
      progressLabel,
      shapingLabel: options.shapingLabel ?? null,
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

/** `0.90× · −2 st` for the active shaping, or null when nothing is shaped. */
export const getPlaybackShapingContextLabel = (
  shaping: Parameters<typeof getPlaybackShapingLabelParts>[0],
) => {
  const parts = getPlaybackShapingLabelParts(shaping);

  return parts.length > 0 ? parts.join(ROW_META_SEPARATOR) : null;
};
