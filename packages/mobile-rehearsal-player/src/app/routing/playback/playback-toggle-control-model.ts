export type PlaybackToggleControlModel = {
  accessibilityLabel: string;
  iconName: 'pause' | 'play';
  selected: boolean;
};

const PLAYBACK_ACTIVE_LABEL = 'Pause';
const PLAYBACK_IDLE_FALLBACK_LABEL = 'Play';
const CURRENT_PLAYBACK_FALLBACK_TITLE = 'current playback';

export const getPlaybackToggleControlModel = (options: {
  playbackToggleLabel: string;
  title?: string;
}): PlaybackToggleControlModel => {
  const normalizedLabel =
    options.playbackToggleLabel.trim() || PLAYBACK_IDLE_FALLBACK_LABEL;
  const normalizedTitle =
    options.title?.trim() || CURRENT_PLAYBACK_FALLBACK_TITLE;
  const selected = normalizedLabel === PLAYBACK_ACTIVE_LABEL;

  return {
    accessibilityLabel: `${normalizedLabel} ${normalizedTitle}`,
    iconName: selected ? 'pause' : 'play',
    selected,
  };
};
