import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { appTheme } from '../../../../utils/theme';
import {
  mapWindow,
  PIANO_SCROLL_STRIP_HEIGHT,
  scrollLeftFromMapX,
} from '../../piano-overlay-model';
import { capturePointer, pointRelativeTo, readPointer } from './pointer-events';

const { colors, radius, space } = appTheme;
const PERCENT = 100;

type PianoScrollStripProps = {
  onScrollLeftChange: (scrollLeft: number) => void;
  scrollLeft: number;
  viewportWidth: number;
};

/**
 * A minimap of all 88 keys with a window over the visible part. Touching or
 * dragging it scrolls the keyboard, so scrolling never competes with playing.
 */
export const PianoScrollStrip = ({
  onScrollLeftChange,
  scrollLeft,
  viewportWidth,
}: PianoScrollStripProps) => {
  const mapRef = useRef<View>(null);
  const isDragging = useRef(false);
  const window = mapWindow(scrollLeft, viewportWidth);

  const seek = (event: unknown) => {
    const point = pointRelativeTo(mapRef.current, readPointer(event));

    onScrollLeftChange(scrollLeftFromMapX(point.x, point.width, viewportWidth));
  };

  const webProps = {
    onPointerDown: (event: unknown) => {
      isDragging.current = true;
      capturePointer(event);
      seek(event);
    },
    onPointerMove: (event: unknown) => {
      if (isDragging.current) {
        seek(event);
      }
    },
    onPointerUp: () => {
      isDragging.current = false;
    },
    onPointerCancel: () => {
      isDragging.current = false;
    },
  };

  return (
    <View
      {...webProps}
      accessibilityLabel="Piano position"
      ref={mapRef}
      style={styles.strip}
      testID="piano-scroll-strip"
    >
      <View
        pointerEvents="none"
        style={[
          styles.window,
          {
            left: `${window.left * PERCENT}%`,
            width: `${window.width * PERCENT}%`,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    height: PIANO_SCROLL_STRIP_HEIGHT,
    justifyContent: 'center',
    marginHorizontal: space.sm,
    touchAction: 'none',
    userSelect: 'none',
  } as never,
  window: {
    position: 'absolute',
    top: space.xs,
    bottom: space.xs,
    backgroundColor: colors.accentRegionFill,
    borderColor: colors.accentRegionEdge,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
});
