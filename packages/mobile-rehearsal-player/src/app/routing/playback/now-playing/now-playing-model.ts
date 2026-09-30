import { formatDurationLabel } from '../../../library/drive/utils/drive-library-view-model';
import { appTheme } from '../../../utils/theme';

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

export type NowPlayingTransportAppearance = {
  /** Hit area and visual size, in points. */
  size: number;
  iconSize: number;
  iconColor: string;
  /** Only play / pause is drawn as the accent ring (1f); the rest are bare glyphs. */
  ring: boolean;
};

const TOUCH_TARGET = 44;
const PLAYBACK_RING_SIZE = 76;
const PLAYBACK_GLYPH_SIZE = 30;
const SECONDARY_GLYPH_SIZE = 26;

// 1f: queue navigation is the quieter `icon` gray, the ±15s rehearsal jumps
// are full-strength `text`, and play / pause is the accent ring.
const TRANSPORT_APPEARANCE: Record<
  NowPlayingTransportControl,
  NowPlayingTransportAppearance
> = {
  'previous-item': {
    iconColor: appTheme.colors.icon,
    iconSize: SECONDARY_GLYPH_SIZE,
    ring: false,
    size: TOUCH_TARGET,
  },
  'seek-backward': {
    iconColor: appTheme.colors.text,
    iconSize: SECONDARY_GLYPH_SIZE,
    ring: false,
    size: TOUCH_TARGET,
  },
  'toggle-playback': {
    iconColor: appTheme.colors.accentText,
    iconSize: PLAYBACK_GLYPH_SIZE,
    ring: true,
    size: PLAYBACK_RING_SIZE,
  },
  'seek-forward': {
    iconColor: appTheme.colors.text,
    iconSize: SECONDARY_GLYPH_SIZE,
    ring: false,
    size: TOUCH_TARGET,
  },
  'next-item': {
    iconColor: appTheme.colors.icon,
    iconSize: SECONDARY_GLYPH_SIZE,
    ring: false,
    size: TOUCH_TARGET,
  },
};

export const getNowPlayingTransportAppearance = (
  control: NowPlayingTransportControl,
): NowPlayingTransportAppearance => {
  return TRANSPORT_APPEARANCE[control];
};

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
