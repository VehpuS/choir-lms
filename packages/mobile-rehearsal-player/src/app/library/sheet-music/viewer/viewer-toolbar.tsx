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
  zoom: number;
};

/** Zoom, and a play/pause control so playback stays reachable while reading. */
export const ViewerToolbar = ({
  isPlaybackToggleDisabled,
  isPlaying,
  onTogglePlayback,
  onZoomIn,
  onZoomOut,
  zoom,
}: ViewerToolbarProps) => {
  return (
    <View style={styles.bar}>
      <View style={styles.zoom}>
        <SurfaceIconButton
          accessibilityLabel="Zoom out"
          disabled={zoom <= VIEWER_MIN_ZOOM}
          icon="minus"
          onPress={onZoomOut}
        />
        <Text accessibilityLiveRegion="polite" style={styles.zoomValue}>
          {formatViewerZoom(zoom)}
        </Text>
        <SurfaceIconButton
          accessibilityLabel="Zoom in"
          disabled={zoom >= VIEWER_MAX_ZOOM}
          icon="plus"
          onPress={onZoomIn}
        />
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
  zoom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.sm,
  },
  zoomValue: {
    ...appTheme.type.rowTitle,
    minWidth: 48,
    textAlign: 'center',
    color: appTheme.colors.text,
  },
});
