import { appTheme } from '../../utils/theme';
import { downsampleWaveformBars } from './model';

export type PlaybackWaveformAppearance = 'dark' | 'light';

export const WAVEFORM_BARS = [
  0.22, 0.36, 0.54, 0.44, 0.68, 0.3, 0.58, 0.4, 0.74, 0.48, 0.62, 0.34, 0.72,
  0.38, 0.57, 0.29, 0.64, 0.42, 0.77, 0.35, 0.59, 0.31, 0.69, 0.47, 0.56, 0.33,
  0.61, 0.27,
] as const;

// The mini-player band shows a 9-bar summary of the same bar data.
const MINI_WAVEFORM_BAR_COUNT = 9;
export const MINI_WAVEFORM_BARS = downsampleWaveformBars(
  WAVEFORM_BARS,
  MINI_WAVEFORM_BAR_COUNT,
);

export type PlaybackWaveformVariant = 'compact' | 'hero' | 'mini';

export const WAVEFORM_HEIGHT: Record<PlaybackWaveformVariant, number> = {
  compact: 28,
  hero: 154,
  mini: 22,
};

export const MIN_BAR_HEIGHT: Record<PlaybackWaveformVariant, number> = {
  compact: 8,
  hero: 18,
  mini: 2,
};

export const getWaveformColors = (
  variant: PlaybackWaveformVariant,
  appearance: PlaybackWaveformAppearance,
) => {
  // Played bars are accent and unplayed bars the solid divider (README
  // "Waveform"); the older variants keep their appearance mapping until 3.x.
  if (variant === 'mini') {
    return {
      active: appTheme.colors.accent,
      inactive: appTheme.colors.divider,
      indicator: appTheme.colors.text,
    };
  }

  if (appearance === 'dark') {
    return {
      active: appTheme.colors.text,
      inactive: appTheme.colors.borderButton,
      indicator: appTheme.colors.textSecondary,
    };
  }

  return {
    active: appTheme.colors.accent,
    inactive: appTheme.colors.divider,
    indicator: appTheme.colors.textMuted,
  };
};
