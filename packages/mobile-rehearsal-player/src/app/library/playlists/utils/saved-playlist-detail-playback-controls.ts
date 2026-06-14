import type { RehearsalQueueMode } from '@org/audio-library-models';

import {
  getPlaylistQueueModeLabel,
  type PlaylistPlaybackActionCopy,
} from './saved-playlist-playback-view-model';

export type PlaylistDetailPlaybackControl = {
  accessibilityLabel: string;
  disabled: boolean;
  iconName: 'play' | 'shuffle';
  label: string;
  mode: RehearsalQueueMode;
  selected: boolean;
  tone: 'primary' | 'secondary';
};

const getPlaylistDetailPlaybackAccessibilityLabel = (options: {
  action: PlaylistPlaybackActionCopy;
  mode: RehearsalQueueMode;
}) => {
  const modeLabel = getPlaylistQueueModeLabel(options.mode).toLowerCase();

  if (options.action.label === 'Select playlist') {
    return `Select playlist to start ${modeLabel} playback`;
  }

  if (options.action.label === 'Add items first') {
    return `Add items before starting ${modeLabel} playback`;
  }

  if (options.action.label === 'Loading…') {
    return `Loading ${modeLabel} playback`;
  }

  return options.action.label;
};

export const getPlaylistDetailPlaybackControls = (options: {
  activeMode: RehearsalQueueMode | null;
  orderedAction: PlaylistPlaybackActionCopy;
  shuffleAction: PlaylistPlaybackActionCopy;
}): PlaylistDetailPlaybackControl[] => {
  const buildControl = (
    mode: RehearsalQueueMode,
    action: PlaylistPlaybackActionCopy,
  ): PlaylistDetailPlaybackControl => {
    const selected = options.activeMode === mode;

    return {
      accessibilityLabel: getPlaylistDetailPlaybackAccessibilityLabel({
        action,
        mode,
      }),
      disabled: action.disabled,
      iconName: mode === 'ordered' ? 'play' : 'shuffle',
      label: getPlaylistQueueModeLabel(mode),
      mode,
      selected,
      tone:
        selected || (options.activeMode === null && mode === 'ordered')
          ? 'primary'
          : 'secondary',
    };
  };

  return [
    buildControl('ordered', options.orderedAction),
    buildControl('shuffle', options.shuffleAction),
  ];
};
