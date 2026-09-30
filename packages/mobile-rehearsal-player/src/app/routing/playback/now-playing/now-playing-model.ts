import { formatDurationLabel } from '../../../library/drive/utils/drive-library-view-model';

export type NowPlayingTransportControl =
  | 'previous-item'
  | 'seek-backward'
  | 'toggle-playback'
  | 'seek-forward'
  | 'next-item';

const TRANSPORT_CONTROLS: readonly NowPlayingTransportControl[] = [
  'previous-item',
  'seek-backward',
  'toggle-playback',
  'seek-forward',
  'next-item',
];
const QUEUE_ONLY_CONTROLS = new Set<NowPlayingTransportControl>([
  'previous-item',
  'next-item',
]);

const ZERO_TIME_LABEL = '0:00';
const REMAINING_TIME_PREFIX = '−';

export const getNowPlayingKicker = (supportsQueueNavigation: boolean) => {
  return supportsQueueNavigation ? 'Rehearsing queue' : 'Rehearsing';
};

/** Queue navigation surrounds the current-item controls only in a queue. */
export const getNowPlayingTransportControls = (
  supportsQueueNavigation: boolean,
): NowPlayingTransportControl[] => {
  return TRANSPORT_CONTROLS.filter((control) => {
    return supportsQueueNavigation || !QUEUE_ONLY_CONTROLS.has(control);
  });
};

const formatSecondsLabel = (seconds: number) => {
  return formatDurationLabel(Math.round(seconds * 1000)) ?? ZERO_TIME_LABEL;
};

/** Elapsed time on the left of the scrubber, time remaining on the right (1f). */
export const getNowPlayingTimelineLabels = (options: {
  elapsedSeconds: number;
  totalSeconds: number;
}) => {
  const totalSeconds = Math.max(0, options.totalSeconds);
  const elapsedSeconds = Math.min(
    totalSeconds,
    Math.max(0, options.elapsedSeconds),
  );

  return {
    elapsed: formatSecondsLabel(elapsedSeconds),
    remaining: `${REMAINING_TIME_PREFIX}${formatSecondsLabel(totalSeconds - elapsedSeconds)}`,
  };
};
