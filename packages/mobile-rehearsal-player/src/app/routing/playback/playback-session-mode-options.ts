import { type RepeatMode } from '@org/audio-library-models';

export const DEFAULT_REPEAT_MODES: RepeatMode[] = ['off', 'one', 'all'];
export const STANDALONE_REPEAT_MODES: RepeatMode[] = ['off', 'one'];

export const resolveVisibleRepeatModes = (activeQueueMode: boolean) => {
  return activeQueueMode ? DEFAULT_REPEAT_MODES : STANDALONE_REPEAT_MODES;
};

export type RepeatModeIconName = 'repeat' | 'repeat-once';

const REPEAT_MODE_LABELS: Record<RepeatMode, string> = {
  off: 'Repeat off',
  one: 'Repeat one',
  all: 'Repeat all',
};

export type RepeatToggleModel = {
  accessibilityHint: string;
  accessibilityLabel: string;
  icon: RepeatModeIconName;
  nextMode: RepeatMode;
  selected: boolean;
};

// A single cycling button, matching mainstream player conventions (Spotify,
// YouTube Music, Apple Music): repeat-one keeps its own dedicated glyph, while
// off/all share the plain repeat glyph and are told apart by the button's
// selected styling rather than by a second, easily-confused glyph shape.
export const resolveRepeatToggleModel = (
  mode: RepeatMode,
  visibleModes: RepeatMode[],
): RepeatToggleModel => {
  const currentIndex = visibleModes.indexOf(mode);
  const nextMode = visibleModes[(currentIndex + 1) % visibleModes.length];

  return {
    accessibilityHint: `Double tap to change to ${REPEAT_MODE_LABELS[nextMode]}`,
    accessibilityLabel: REPEAT_MODE_LABELS[mode],
    icon: mode === 'one' ? 'repeat-once' : 'repeat',
    nextMode,
    selected: mode !== 'off',
  };
};
