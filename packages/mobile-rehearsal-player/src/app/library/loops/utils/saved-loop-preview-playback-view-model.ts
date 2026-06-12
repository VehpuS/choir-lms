import type { PlayableItem } from '@org/audio-library-models';

export type LoopPreviewPlaybackTimeline = {
  canScrub: boolean;
  elapsedSeconds: number;
  positionSeconds: number;
  progressRatio: number;
  totalDurationSeconds: number;
};

type ResolveLoopPreviewPlaybackTimelineOptions = {
  activePlayableItem: PlayableItem | null;
  playbackPositionSeconds: number;
  previewPlayableItem: PlayableItem | null;
};

export const resolveLoopPreviewPlaybackTimeline = (
  options: ResolveLoopPreviewPlaybackTimelineOptions,
): LoopPreviewPlaybackTimeline | null => {
  if (!options.previewPlayableItem) {
    return null;
  }

  const startSeconds = options.previewPlayableItem.range.startMs / 1000;
  const endSeconds =
    (options.previewPlayableItem.range.endMs ??
      options.previewPlayableItem.source.durationMs ??
      options.previewPlayableItem.range.startMs) / 1000;
  const totalDurationSeconds = Math.max(0, endSeconds - startSeconds);
  const isActivePreview =
    options.activePlayableItem?.id === options.previewPlayableItem.id;
  const positionSeconds = isActivePreview
    ? Math.min(
        endSeconds,
        Math.max(startSeconds, options.playbackPositionSeconds),
      )
    : startSeconds;
  const elapsedSeconds = Math.max(0, positionSeconds - startSeconds);

  return {
    canScrub: isActivePreview && totalDurationSeconds > 0,
    elapsedSeconds,
    positionSeconds,
    progressRatio:
      totalDurationSeconds <= 0 ? 0 : elapsedSeconds / totalDurationSeconds,
    totalDurationSeconds,
  };
};
