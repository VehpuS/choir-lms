import { appTheme } from '../../utils/theme';

export type PlaybackWaveformAppearance = 'dark' | 'light';

// How many bars each variant draws from an item's peaks. The mini-player band
// shows a 9-bar summary; wider variants spread thin bars across their width.
export const WAVEFORM_BAR_COUNT = {
  compact: 40,
  excerpt: 40,
  mini: 9,
  scrubber: 64,
} as const;

// `excerpt` is the bare 28pt bar strip inside an expanded loop card (1d);
// `scrubber` is the now-playing sheet's scrubber (1f).
export type PlaybackWaveformVariant =
  | 'compact'
  | 'excerpt'
  | 'mini'
  | 'scrubber';

export const WAVEFORM_HEIGHT: Record<PlaybackWaveformVariant, number> = {
  compact: 28,
  excerpt: 28,
  mini: 22,
  scrubber: 56,
};

export const MIN_BAR_HEIGHT: Record<PlaybackWaveformVariant, number> = {
  compact: 8,
  excerpt: 4,
  mini: 2,
  scrubber: 2,
};

// Variants drawn as bare Nocturne bars (README "Waveform"); `compact` keeps
// its pre-Nocturne pill until the loop editor moves over in 3.4.
const NOCTURNE_VARIANTS = new Set<PlaybackWaveformVariant>([
  'excerpt',
  'mini',
  'scrubber',
]);

export const getWaveformColors = (
  variant: PlaybackWaveformVariant,
  appearance: PlaybackWaveformAppearance,
) => {
  // Played bars are accent and unplayed bars the solid divider (README
  // "Waveform"); the older variants keep their appearance mapping until 3.x.
  if (NOCTURNE_VARIANTS.has(variant)) {
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
