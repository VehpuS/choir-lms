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
