import type { PdfLayout } from '@org/audio-library-models';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CompactPlaybackAction } from '../../../components/compact-playback-action';
import { SurfaceIconButton } from '../../../components/surface-icon-button';
import { PracticeToolsControl } from '../../practice-tools/practice-tools-control';
import type { PracticeTools } from '../../practice-tools/use-practice-tools';
import { PDF_LAYOUT_ICONS } from '../pdf-layout/pdf-layout-sheet-model';
import { appTheme } from '../../../utils/theme';
import { useOtherOctaveToggle } from './use-other-octave-toggle';
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
  /** A score is open (not a PDF), so its `Show other-octave matches` toggle is offered. */
  isScore: boolean;
  /** Opens the PDF `Layout` sheet; absent unless a PDF is open. */
  pdfLayout?: { layout: PdfLayout; onOpen: () => void };
  onTogglePlayback: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** The most this document zooms in to; a PDF goes further than a score. */
  maxZoom?: number;
  /** `column` is the compact layout's side rail; `row` runs along the bottom. */
  orientation: 'column' | 'row';
  /** Held by the viewer: the rail's menu is drawn outside the scrolling rail. */
  practiceTools: PracticeTools;
  zoom: number;
};

/** Zoom, and a play/pause control so playback stays reachable while reading. */
export const ViewerToolbar = ({
  isFitted,
  isPlaybackToggleDisabled,
  isPlaying,
  isScore,
  maxZoom = VIEWER_MAX_ZOOM,
  onFit,
  onGoTo,
  onTogglePlayback,
  onZoomIn,
  onZoomOut,
  orientation,
  pageGroup,
  pdfLayout,
  practiceTools,
  zoom,
}: ViewerToolbarProps) => {
  const isColumn = orientation === 'column';
  const otherOctave = useOtherOctaveToggle(isScore);
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
  // A setting of the score, so it sits with the score's controls rather than
  // in the Practice tools menu.
  const otherOctaveButton = otherOctave ? (
    <SurfaceIconButton
      accessibilityLabel={otherOctave.accessibilityLabel}
      icon="music-notes-plus"
      key="other-octave"
      onPress={otherOctave.onToggle}
      selected={otherOctave.isOn}
    />
  ) : null;
  // In the side rail the Practice tools menu opens sideways, toward the
  // score; along the bottom it opens upward.
  const practiceToolsButton = (
    <PracticeToolsControl
      anchorStyle={styles.menuAnchor}
      key="practice-tools"
      menuPlacement={styles.menuAboveBar}
      showMenu={!isColumn}
      tools={practiceTools}
      renderTrigger={({
        accessibilityLabel,
        isActive,
        isExpanded,
        onPress,
      }) => (
        <SurfaceIconButton
          accessibilityLabel={accessibilityLabel}
          expanded={isExpanded}
          icon="practice-tools"
          onPress={onPress}
          selected={isActive}
        />
      )}
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
        {isColumn
          ? [
              zoomIn,
              zoomValue,
              zoomOut,
              fitButton,
              layoutButton,
              pageGroup,
              goToButton,
              otherOctaveButton,
              practiceToolsButton,
            ]
          : [
              zoomOut,
              zoomValue,
              zoomIn,
              fitButton,
              layoutButton,
              pageGroup,
              goToButton,
              otherOctaveButton,
              practiceToolsButton,
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
    // Zoom, fit, go to, and practice tools plus play do not fit one row on a narrow
    // phone, so the controls wrap rather than run off the edge.
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: appTheme.space.sm,
  },
  // The button sits mid-row, so the menu is placed against the whole toolbar
  // (a static anchor leaves the toolbar as the positioned parent) to keep it
  // inside the screen. In the side rail the viewer draws the menu itself.
  menuAnchor: { position: 'static' },
  menuAboveBar: { bottom: '100%', left: 0, marginBottom: appTheme.space.xs },
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
