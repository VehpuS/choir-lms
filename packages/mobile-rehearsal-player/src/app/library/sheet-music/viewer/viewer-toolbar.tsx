import type { PdfLayout } from '@org/audio-library-models';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CompactPlaybackAction } from '../../../components/compact-playback-action';
import { SurfaceIconButton } from '../../../components/surface-icon-button';
import { usePianoToggle } from '../../piano/piano-toggle';
import { PDF_LAYOUT_ICONS } from '../pdf-layout/pdf-layout-sheet-model';
import { appTheme } from '../../../utils/theme';
import { VIEWER_MAX_ZOOM, VIEWER_MIN_ZOOM, formatViewerZoom } from './model';

type ViewerToolbarProps = {
  /** Auto-fit is on, so the zoom follows the available height. */
  isFitted: boolean;
  isPlaybackToggleDisabled: boolean;
  isPlaying: boolean;
  /** Opens the `Go to` drawer; absent when the document has no bars to go to. */
  onGoTo: (() => void) | undefined;
  /** Turns auto-fit back on; absent for a PDF, which fits to width instead. */
  onFit: (() => void) | undefined;
  /** The page group of the compact rail (`Previous page`, `3/81`, `Next page`); absent elsewhere. */
  pageGroup?: ReactNode;
  /** Opens the PDF `Layout` sheet; absent unless a PDF is open. */
  pdfLayout?: { layout: PdfLayout; onOpen: () => void };
  onTogglePlayback: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** The most this document zooms in to; a PDF goes further than a score. */
  maxZoom?: number;
  /** `column` is the compact layout's side rail; `row` runs along the bottom. */
  orientation: 'column' | 'row';
  zoom: number;
};

/** Zoom, and a play/pause control so playback stays reachable while reading. */
export const ViewerToolbar = ({
  isFitted,
  isPlaybackToggleDisabled,
  isPlaying,
  maxZoom = VIEWER_MAX_ZOOM,
  onFit,
  onGoTo,
  onTogglePlayback,
  onZoomIn,
  onZoomOut,
  orientation,
  pageGroup,
  pdfLayout,
  zoom,
}: ViewerToolbarProps) => {
  const isColumn = orientation === 'column';
  const pianoToggle = usePianoToggle();
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
      disabled={zoom >= maxZoom}
      icon="plus"
      key="in"
      onPress={onZoomIn}
    />
  );
  const fitButton = onFit ? (
    <SurfaceIconButton
      accessibilityLabel="Fit to height"
      icon="fit-height"
      key="fit"
      onPress={onFit}
      selected={isFitted}
    />
  ) : null;
  // The glyph shows the layout in use, so the button also says where you are.
  const layoutButton = pdfLayout ? (
    <SurfaceIconButton
      accessibilityLabel="Layout"
      icon={PDF_LAYOUT_ICONS[pdfLayout.layout]}
      key="layout"
      onPress={pdfLayout.onOpen}
    />
  ) : null;
  const goToButton = onGoTo ? (
    <SurfaceIconButton
      accessibilityLabel="Go to bar or rehearsal mark"
      icon="list-numbers"
      key="go-to"
      onPress={onGoTo}
    />
  ) : null;
  const pianoButton = pianoToggle ? (
    <SurfaceIconButton
      accessibilityLabel={pianoToggle.accessibilityLabel}
      icon="piano-keyboard"
      key="piano"
      onPress={pianoToggle.toggle}
      selected={pianoToggle.selected}
    />
  ) : null;
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
        {isColumn
          ? [
              zoomIn,
              zoomValue,
              zoomOut,
              fitButton,
              layoutButton,
              pageGroup,
              goToButton,
              pianoButton,
            ]
          : [
              zoomOut,
              zoomValue,
              zoomIn,
              fitButton,
              layoutButton,
              pageGroup,
              goToButton,
              pianoButton,
            ]}
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
    flexShrink: 1,
    // Zoom, fit, go to, and piano plus play do not fit one row on a narrow
    // phone, so the controls wrap rather than run off the edge.
    flexWrap: 'wrap',
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
