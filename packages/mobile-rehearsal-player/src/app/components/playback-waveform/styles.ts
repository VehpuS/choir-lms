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
  // The now-playing scrubber is bare bars at a fixed height, no container.
  scrubberContainer: {
    height: WAVEFORM_HEIGHT.scrubber,
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
  // Thin bars spread across the available width (1d, 1f).
  spreadBarRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spreadBar: {
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
  scrubIndicator: {
    position: 'absolute',
    top: 16,
    bottom: 16,
    width: 2,
    marginLeft: -1,
    borderRadius: 999,
  },
  // The scrubber's playhead spans the full height with a soft glow.
  playhead: {
    top: 0,
    bottom: 0,
    shadowColor: appTheme.colors.text,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
});

export const CONTAINER_STYLE: Record<PlaybackWaveformVariant, ViewStyle> = {
  compact: waveformStyles.compactContainer,
  excerpt: waveformStyles.excerptContainer,
  mini: waveformStyles.miniContainer,
  scrubber: waveformStyles.scrubberContainer,
};

export const BAR_ROW_STYLE: Record<PlaybackWaveformVariant, ViewStyle | null> =
  {
    compact: waveformStyles.compactBarRow,
    excerpt: waveformStyles.spreadBarRow,
    mini: waveformStyles.miniBarRow,
    scrubber: waveformStyles.spreadBarRow,
  };

export const BAR_STYLE: Record<PlaybackWaveformVariant, ViewStyle> = {
  compact: waveformStyles.compactBar,
  excerpt: waveformStyles.spreadBar,
  mini: waveformStyles.miniBar,
  scrubber: waveformStyles.spreadBar,
};

export const SCRUB_INDICATOR_STYLE: Record<
  PlaybackWaveformVariant,
  ViewStyle | null
> = {
  compact: null,
  excerpt: null,
  mini: null,
  scrubber: waveformStyles.playhead,
};
