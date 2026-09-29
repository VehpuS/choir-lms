import { StyleSheet, type ViewStyle } from 'react-native';

import { appTheme } from '../../utils/theme';
import { WAVEFORM_HEIGHT, type PlaybackWaveformVariant } from './variants';

export const waveformStyles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  compactContainer: {
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: appTheme.colors.hairline,
  },
  heroContainer: {
    minHeight: 188,
    paddingHorizontal: 14,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 28,
    backgroundColor: appTheme.colors.surface,
  },
  barRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  compactBarRow: {
    gap: 2,
  },
  excerptContainer: {
    height: WAVEFORM_HEIGHT.excerpt,
  },
  // Thin bars spread across the card's width (1d).
  excerptBarRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  excerptBar: {
    maxWidth: 3,
    borderRadius: 2,
  },
  miniContainer: {
    height: WAVEFORM_HEIGHT.mini,
  },
  miniBarRow: {
    alignItems: 'center',
    gap: 2,
  },
  // Fixed 2pt bars: reset the shared `flex: 1` so the basis is the width.
  miniBar: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    width: 2,
    borderRadius: 2,
  },
  bar: {
    flex: 1,
    borderRadius: 999,
  },
  compactBar: {
    minWidth: 2,
  },
  heroBar: {
    minWidth: 4,
  },
  scrubIndicator: {
    position: 'absolute',
    top: 16,
    bottom: 16,
    width: 2,
    marginLeft: -1,
    borderRadius: 999,
  },
});

export const CONTAINER_STYLE: Record<PlaybackWaveformVariant, ViewStyle> = {
  compact: waveformStyles.compactContainer,
  excerpt: waveformStyles.excerptContainer,
  hero: waveformStyles.heroContainer,
  mini: waveformStyles.miniContainer,
};

export const BAR_ROW_STYLE: Record<PlaybackWaveformVariant, ViewStyle | null> =
  {
    compact: waveformStyles.compactBarRow,
    excerpt: waveformStyles.excerptBarRow,
    hero: null,
    mini: waveformStyles.miniBarRow,
  };

export const BAR_STYLE: Record<PlaybackWaveformVariant, ViewStyle> = {
  compact: waveformStyles.compactBar,
  excerpt: waveformStyles.excerptBar,
  hero: waveformStyles.heroBar,
  mini: waveformStyles.miniBar,
};
