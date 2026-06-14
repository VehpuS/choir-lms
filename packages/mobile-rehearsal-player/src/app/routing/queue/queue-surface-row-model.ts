import { getPlaybackToggleControlModel } from '../playback/playback-toggle-control-model';

export type QueueRowPlaybackAction = {
  accessibilityLabel: string;
  iconName: 'pause' | 'play';
  pressBehavior: 'play-item' | 'toggle-current';
  selected: boolean;
};

export type QueueRowPresentation = {
  emphasis: 'current' | 'upcoming';
  playbackAction: QueueRowPlaybackAction;
};

export const getQueueRowPlaybackAction = (options: {
  isCurrent: boolean;
  playbackToggleLabel: string;
  title: string;
}): QueueRowPlaybackAction => {
  if (!options.isCurrent) {
    return {
      accessibilityLabel: `Play ${options.title}`,
      iconName: 'play',
      pressBehavior: 'play-item',
      selected: false,
    };
  }

  const playbackToggleControl = getPlaybackToggleControlModel({
    playbackToggleLabel: options.playbackToggleLabel,
    title: options.title,
  });

  return {
    accessibilityLabel: playbackToggleControl.accessibilityLabel,
    iconName: playbackToggleControl.iconName,
    pressBehavior: 'toggle-current',
    selected: playbackToggleControl.selected,
  };
};

export const getQueueRowPresentation = (options: {
  isCurrent: boolean;
  playbackToggleLabel: string;
  title: string;
}): QueueRowPresentation => {
  return {
    emphasis: options.isCurrent ? 'current' : 'upcoming',
    playbackAction: getQueueRowPlaybackAction(options),
  };
};