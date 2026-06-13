import type { PlayableItem, RepeatMode } from '@org/audio-library-models';

const LOOP_RANGE_END_TOLERANCE_MS = 250;
const DEFAULT_PLAYBACK_VOLUME_LEVEL = 1;

export const hasSavedTrackPlaybackReachedRangeEnd = (options: {
  activePlayableItem: PlayableItem | null;
  playbackState: string | undefined;
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

export const hydratePlayableItemDuration = (options: {
  durationSeconds: number;
  playableItem: PlayableItem;
}) => {
  if (
    options.playableItem.kind !== 'track' ||
    !Number.isFinite(options.durationSeconds) ||
    options.durationSeconds <= 0
  ) {
    return options.playableItem;
  }

  const durationMs = Math.round(options.durationSeconds * 1000);
  const hasResolvedSourceDuration =
    options.playableItem.source.durationMs === durationMs;
  const hasResolvedRangeEnd = options.playableItem.range.endMs === durationMs;

  if (hasResolvedSourceDuration && hasResolvedRangeEnd) {
    return options.playableItem;
  }

  return {
    ...options.playableItem,
    source: hasResolvedSourceDuration
      ? options.playableItem.source
      : {
          ...options.playableItem.source,
          durationMs,
        },
    range: hasResolvedRangeEnd
      ? options.playableItem.range
      : {
          ...options.playableItem.range,
          endMs: durationMs,
        },
  } satisfies PlayableItem;
};

export const shouldRepeatSingleItemPlayback = (repeatMode: RepeatMode) => {
  return repeatMode === 'one';
};
