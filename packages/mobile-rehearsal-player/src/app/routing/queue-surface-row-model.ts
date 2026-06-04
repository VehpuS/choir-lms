export type QueueRowPlaybackAction = {
  accessibilityLabel: string;
  iconName: 'pause' | 'play';
  pressBehavior: 'play-item' | 'toggle-current';
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