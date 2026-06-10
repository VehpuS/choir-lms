export type QueueRowPlaybackAction = {
  accessibilityLabel: string;
  iconName: 'pause' | 'play';
  pressBehavior: 'play-item' | 'toggle-current';
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
    };
  }

  const normalizedLabel = options.playbackToggleLabel.trim() || 'Play';

  return {
    accessibilityLabel: `${normalizedLabel} ${options.title}`,
    iconName: normalizedLabel === 'Pause' ? 'pause' : 'play',
    pressBehavior: 'toggle-current',
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