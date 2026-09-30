import { getPlaybackToggleControlModel } from '../playback/playback-toggle-control-model';

export type QueueRowPresentation = {
  accessibilityLabel: string;
  emphasis: 'current' | 'upcoming';
  /** What tapping the row does: start it, or toggle the item already current. */
  pressBehavior: 'play-item' | 'toggle-current';
  /** The current row's status, set before its meta line (1h: `Playing`). */
  statusLabel: 'Loading' | 'Paused' | 'Playing' | null;
};

const getCurrentStatusLabel = (isPlaying: boolean, isLoading: boolean) => {
  if (isLoading) {
    return 'Loading';
  }

  return isPlaying ? 'Playing' : 'Paused';
};

export const getQueueRowPresentation = (options: {
  isCurrent: boolean;
  /** The current item is still loading, so it is neither playing nor paused. */
  isLoading?: boolean;
  playbackToggleLabel: string;
  title: string;
}): QueueRowPresentation => {
  if (!options.isCurrent) {
    return {
      accessibilityLabel: `Play ${options.title}`,
      emphasis: 'upcoming',
      pressBehavior: 'play-item',
      statusLabel: null,
    };
  }

  const playbackToggleControl = getPlaybackToggleControlModel({
    playbackToggleLabel: options.playbackToggleLabel,
    title: options.title,
  });

  return {
    accessibilityLabel: playbackToggleControl.accessibilityLabel,
    emphasis: 'current',
    pressBehavior: 'toggle-current',
    statusLabel: getCurrentStatusLabel(
      playbackToggleControl.selected,
      options.isLoading ?? false,
    ),
  };
};
