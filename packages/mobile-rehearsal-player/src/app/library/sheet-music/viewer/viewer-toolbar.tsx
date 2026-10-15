import { StyleSheet, Text, View } from 'react-native';

import { CompactPlaybackAction } from '../../../components/compact-playback-action';
import { SurfaceIconButton } from '../../../components/surface-icon-button';
import { appTheme } from '../../../utils/theme';
import { VIEWER_MAX_ZOOM, VIEWER_MIN_ZOOM, formatViewerZoom } from './model';

type ViewerToolbarProps = {
  isPlaybackToggleDisabled: boolean;
  isPlaying: boolean;
  onTogglePlayback: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** `column` is the compact layout's side rail; `row` runs along the bottom. */
  orientation: 'column' | 'row';
  zoom: number;
};

/** Zoom, and a play/pause control so playback stays reachable while reading. */
export const ViewerToolbar = ({
  isPlaybackToggleDisabled,
  isPlaying,
  onTogglePlayback,
  onZoomIn,
  onZoomOut,
  orientation,
  zoom,
}: ViewerToolbarProps) => {
  const isColumn = orientation === 'column';
  // In a column the larger zoom is on top, as a slider reads.
  const zoomOut = (
    <SurfaceIconButton
      accessibilityLabel="Zoom out"
      disabled={zoom <= VIEWER_MIN_ZOOM}
      icon="minus"
      key="out"
      onPress={onZoomOut}
    />
  );
  const zoomIn = (
    <SurfaceIconButton
      accessibilityLabel="Zoom in"
      disabled={zoom >= VIEWER_MAX_ZOOM}
      icon="plus"
      key="in"
      onPress={onZoomIn}
    />
  );
  const zoomValue = (
    <Text
      accessibilityLiveRegion="polite"
      key="value"
      style={[styles.zoomValue, isColumn ? styles.zoomValueColumn : undefined]}
    >
      {formatViewerZoom(zoom)}
    </Text>
  );

  return (
    <View style={[styles.bar, isColumn ? styles.barColumn : undefined]}>
      <View style={[styles.zoom, isColumn ? styles.zoomColumn : undefined]}>
        {isColumn ? [zoomIn, zoomValue, zoomOut] : [zoomOut, zoomValue, zoomIn]}
      </View>
      <CompactPlaybackAction
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        disabled={isPlaybackToggleDisabled}
        iconName={isPlaying ? 'pause' : 'play'}
        onPress={onTogglePlayback}
        variant="card"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barColumn: {
    flexDirection: 'column',
    gap: appTheme.space.md,
  },
  zoom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.sm,
  },
  zoomColumn: {
    flexDirection: 'column',
    gap: appTheme.space.xs,
  },
  zoomValue: {
    ...appTheme.type.rowTitle,
    minWidth: 48,
    textAlign: 'center',
    color: appTheme.colors.text,
  },
  zoomValueColumn: {
    minWidth: 0,
  },
});
