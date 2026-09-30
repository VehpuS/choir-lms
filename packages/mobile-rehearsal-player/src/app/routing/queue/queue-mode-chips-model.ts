import type { RehearsalQueueMode, RepeatMode } from '@org/audio-library-models';

import type { AppIconName } from '../../components/app-icon';
import {
  DEFAULT_REPEAT_MODES,
  resolveRepeatToggleModel,
} from '../playback/playback-session-mode-options';

export type QueueModeChip =
  | {
      accessibilityLabel: string;
      icon: AppIconName;
      key: 'ordered' | 'shuffle';
      label: string;
      mode: RehearsalQueueMode;
      selected: boolean;
    }
  | {
      accessibilityHint: string;
      accessibilityLabel: string;
      icon: AppIconName;
      key: 'repeat';
      label: string;
      mode: RepeatMode;
      selected: boolean;
    };

const REPEAT_CHIP_LABELS: Record<RepeatMode, string> = {
  all: 'All',
  off: 'Off',
  one: 'One',
};

/**
 * Up Next's mode chips (1h): `Ordered` and `Shuffle` are the two sides of the
 * queue mode, and one repeat chip cycles off, one, and all, lit whenever
 * repeat is on. A chip's `mode` is what pressing it selects.
 */
export const getQueueModeChips = (options: {
  queueMode: RehearsalQueueMode;
  repeatMode: RepeatMode;
}): QueueModeChip[] => {
  const repeatToggle = resolveRepeatToggleModel(
    options.repeatMode,
    DEFAULT_REPEAT_MODES,
  );

  return [
    {
      accessibilityLabel: 'Play in order',
      icon: 'list-numbers',
      key: 'ordered',
      label: 'Ordered',
      mode: 'ordered',
      selected: options.queueMode === 'ordered',
    },
    {
      accessibilityLabel: 'Shuffle playback',
      icon: 'shuffle',
      key: 'shuffle',
      label: 'Shuffle',
      mode: 'shuffle',
      selected: options.queueMode === 'shuffle',
    },
    {
      accessibilityHint: repeatToggle.accessibilityHint,
      accessibilityLabel: repeatToggle.accessibilityLabel,
      icon: repeatToggle.icon,
      key: 'repeat',
      label: REPEAT_CHIP_LABELS[options.repeatMode],
      mode: repeatToggle.nextMode,
      selected: repeatToggle.selected,
    },
  ];
};
