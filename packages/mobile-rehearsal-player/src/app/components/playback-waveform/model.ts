import type { PlayableItem } from '@org/audio-library-models';

const WAVEFORM_PROGRESS_SETTLE_TOLERANCE = 0.015;

export const clampWaveformRatio = (ratio: number) => {
  if (!Number.isFinite(ratio)) {
    return 0;
  }

  return Math.min(1, Math.max(0, ratio));
};

export const getPlaybackBoundsSeconds = (activePlayableItem: PlayableItem) => {
  const startSeconds = activePlayableItem.range.startMs / 1000;
  const rangeEndMs =
    activePlayableItem.range.endMs ?? activePlayableItem.source.durationMs;

  if (rangeEndMs === undefined) {
    return {
      endSeconds: startSeconds,
      startSeconds,
    };
  }

  return {
    endSeconds: rangeEndMs / 1000,
    startSeconds,
  };
};

export const resolveWaveformRatioFromLocation = (
  locationX: number,
  layoutWidth: number,
) => {
  if (layoutWidth <= 0) {
    return 0;
  }

  return clampWaveformRatio(locationX / layoutWidth);
};

export const isWaveformScrubReady = (options: {
  hasScrubRange: boolean;
  interactive: boolean;
  layoutWidth: number;
  onScrubToPosition?: (positionSeconds: number) => void;
}) => {
  return (
    options.interactive &&
    Boolean(options.onScrubToPosition) &&
    options.hasScrubRange &&
    options.layoutWidth > 0
  );
};

export const resolveWaveformCommitRatio = (options: {
  draftRatio: number | null;
  layoutWidth: number;
  locationX: number;
}) => {
  if (options.draftRatio !== null) {
    return clampWaveformRatio(options.draftRatio);
  }

  return resolveWaveformRatioFromLocation(
    options.locationX,
    options.layoutWidth,
  );
};

export const hasWaveformProgressSettled = (options: {
  progressRatio: number;
  targetRatio: number | null;
}) => {
  if (options.targetRatio === null) {
    return true;
  }

  return (
    Math.abs(
      clampWaveformRatio(options.progressRatio) -
        clampWaveformRatio(options.targetRatio),
    ) <= WAVEFORM_PROGRESS_SETTLE_TOLERANCE
  );
};

/**
 * Reduces a bar-amplitude series to `count` bars, keeping the loudest value in
 * each bucket so short peaks survive the smaller rendering.
 */
export const downsampleWaveformBars = (
  amplitudes: readonly number[],
  count: number,
): number[] => {
  if (count <= 0 || amplitudes.length === 0) {
    return [];
  }

  if (amplitudes.length <= count) {
    return [...amplitudes];
  }

  return Array.from({ length: count }, (_, bucketIndex) => {
    const bucketStart = Math.floor((bucketIndex * amplitudes.length) / count);
    const bucketEnd = Math.floor(
      ((bucketIndex + 1) * amplitudes.length) / count,
    );

    return Math.max(...amplitudes.slice(bucketStart, bucketEnd));
  });
};

/** A bar counts as played once progress reaches its trailing edge. */
export const isWaveformBarPlayed = (options: {
  barCount: number;
  barIndex: number;
  progressRatio: number;
}) => {
  return (
    clampWaveformRatio(options.progressRatio) >=
    (options.barIndex + 1) / options.barCount
  );
};

/** Width of a non-interactive progress line, as a percentage string. */
export const getProgressLineWidth = (progressRatio: number) => {
  return `${clampWaveformRatio(progressRatio) * 100}%` as const;
};
