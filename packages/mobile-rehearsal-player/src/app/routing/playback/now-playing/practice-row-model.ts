import type { RehearsalQueueMode, RepeatMode } from '@org/audio-library-models';

import type { AppIconName } from '../../../components/app-icon';
import {
  resolveRepeatToggleModel,
  resolveVisibleRepeatModes,
} from '../playback-session-mode-options';

export type PracticeTile =
  | {
      accessibilityHint?: string;
      accessibilityLabel: string;
      icon: AppIconName;
      key: 'repeat';
      nextMode: RepeatMode;
      selected: boolean;
    }
  | {
      accessibilityHint?: string;
      accessibilityLabel: string;
      icon: AppIconName;
      key: 'shuffle';
      nextMode: RehearsalQueueMode;
      selected: boolean;
    };

const getShuffleTile = (queueMode: RehearsalQueueMode): PracticeTile => {
  const isShuffled = queueMode === 'shuffle';

  return {
    accessibilityLabel: isShuffled
      ? 'Disable shuffle playback'
      : 'Enable shuffle playback',
    icon: 'shuffle',
    key: 'shuffle',
    nextMode: isShuffled ? 'ordered' : 'shuffle',
    selected: isShuffled,
  };
};

/**
 * The collapsed playback state's practice row (1f): repeat always, shuffle
 * only for queued playback. Speed and pitch tiles join it with playback
 * shaping (tasks 5.3 / 6.1).
 */
export const getPracticeTiles = (options: {
  queueMode: RehearsalQueueMode | null;
  repeatMode: RepeatMode;
}): PracticeTile[] => {
  const isQueued = options.queueMode !== null;
  const repeatToggle = resolveRepeatToggleModel(
    options.repeatMode,
    resolveVisibleRepeatModes(isQueued),
  );
  const repeatTile: PracticeTile = {
    accessibilityHint: repeatToggle.accessibilityHint,
    accessibilityLabel: repeatToggle.accessibilityLabel,
    icon: repeatToggle.icon,
    key: 'repeat',
    nextMode: repeatToggle.nextMode,
    selected: repeatToggle.selected,
  };

  if (options.queueMode === null) {
    return [repeatTile];
  }

  return [repeatTile, getShuffleTile(options.queueMode)];
};
