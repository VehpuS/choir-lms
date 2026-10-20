import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../../utils/theme';
import {
  mapWindow,
  octaveTicks,
  PIANO_SCROLL_STRIP_HEIGHT,
  scrollLeftFromMapX,
} from '../../piano-overlay-model';
import { capturePointer, pointRelativeTo, readPointer } from './pointer-events';

const { colors, radius, space } = appTheme;
const PERCENT = 100;
const TICK_FONT_SIZE = 10;
const OCTAVE_TICKS = octaveTicks();

type PianoScrollStripProps = {
  onScrollLeftChange: (scrollLeft: number) => void;
  scrollLeft: number;
  /** The width of the whole keyboard at the current key width. */
  stripWidth: number;
  viewportWidth: number;
};

/**
 * A minimap of all 88 keys with a window over the visible part. Touching or
 * dragging it scrolls the keyboard, so scrolling never competes with playing.
 */
export const PianoScrollStrip = ({
  onScrollLeftChange,
  scrollLeft,
  stripWidth,
  viewportWidth,
}: PianoScrollStripProps) => {
  const mapRef = useRef<View>(null);
  const isDragging = useRef(false);
  const window = mapWindow(scrollLeft, viewportWidth, stripWidth);

  const seek = (event: unknown) => {
    const point = pointRelativeTo(mapRef.current, readPointer(event));

    onScrollLeftChange(
      scrollLeftFromMapX(point.x, point.width, viewportWidth, stripWidth),
    );
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
      {OCTAVE_TICKS.map((tick) => (
        <View
          key={tick.label}
          pointerEvents="none"
          style={[styles.tick, { left: `${tick.position * PERCENT}%` }]}
        >
          <View style={styles.tickMark} />
          <Text style={styles.tickLabel}>{tick.label}</Text>
        </View>
      ))}
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
  // A zero-width column on the C key's centre, so the label centres on it.
  tick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickMark: {
    width: 1,
    height: space.sm,
    backgroundColor: colors.divider,
  },
  tickLabel: {
    color: colors.textMuted,
    fontSize: TICK_FONT_SIZE,
    width: space.xxl,
    textAlign: 'center',
  },
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
