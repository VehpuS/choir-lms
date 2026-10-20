import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { appTheme } from '../../../../utils/theme';
import {
  BLACK_KEY_HEIGHT_RATIO,
  type KeyboardLayout,
  pianoKeyLabel,
  type PianoLabelOptions,
} from '../../keyboard-layout';
import { clampScrollLeft } from '../../piano-overlay-model';
import { createKeyGestures } from '../../piano-key-gestures';
import { capturePointer, pointRelativeTo, readPointer } from './pointer-events';

const { colors, radius } = appTheme;
const LABEL_FONT_SIZE = 10;
const WHEEL_SCROLL_FACTOR = 1;

type PianoKeyboardProps = {
  keyHeight: number;
  layout: KeyboardLayout;
  labelOptions: PianoLabelOptions;
  onPress: (midi: number) => void;
  onRelease: (midi: number) => void;
  onScrollLeftChange: (scrollLeft: number) => void;
  onViewportWidthChange: (width: number) => void;
  scrollLeft: number;
  sounding: ReadonlySet<number>;
};

type WheelEvent = {
  deltaX?: number;
  deltaY?: number;
  shiftKey?: boolean;
  preventDefault?: () => void;
};

/**
 * The keys. A touch that begins on a key plays and never scrolls (the keys
 * claim the pointer and the page cannot pan them); scrolling is the minimap
 * beneath, or a horizontal wheel / trackpad gesture on the keys.
 */
export const PianoKeyboard = ({
  keyHeight,
  layout,
  labelOptions,
  onPress,
  onRelease,
  onScrollLeftChange,
  onViewportWidthChange,
  scrollLeft,
  sounding,
}: PianoKeyboardProps) => {
  const surfaceRef = useRef<View>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  // The gesture model outlives renders; it reads the latest height and
  // handlers through refs so it is created once.
  const latest = useRef({ keyHeight, layout, onPress, onRelease });

  latest.current = { keyHeight, layout, onPress, onRelease };

  const gestures = useMemo(() => {
    return createKeyGestures(
      {
        press: (midi) => {
          latest.current.onPress(midi);
        },
        release: (midi) => {
          latest.current.onRelease(midi);
        },
      },
      {
        keyHeight: () => latest.current.keyHeight,
        layout: () => latest.current.layout,
      },
    );
  }, []);

  useEffect(() => {
    return () => {
      gestures.releaseAll();
    };
  }, [gestures]);

  const stripPoint = (event: unknown) => {
    const sample = readPointer(event);
    const point = pointRelativeTo(surfaceRef.current, sample);

    return { id: sample.id, x: point.x + scrollLeft, y: point.y };
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;

    setViewportWidth(width);
    onViewportWidthChange(width);
  };

  const webProps = {
    onPointerDown: (event: unknown) => {
      const { id, x, y } = stripPoint(event);

      capturePointer(event);
      gestures.pointerDown(id, x, y);
    },
    onPointerMove: (event: unknown) => {
      const { id, x, y } = stripPoint(event);

      gestures.pointerMove(id, x, y);
    },
    onPointerUp: (event: unknown) => {
      gestures.pointerUp(readPointer(event).id);
    },
    onPointerCancel: (event: unknown) => {
      gestures.pointerCancel(readPointer(event).id);
    },
    onWheel: (event: WheelEvent) => {
      const delta = event.shiftKey ? (event.deltaY ?? 0) : (event.deltaX ?? 0);

      if (delta !== 0) {
        event.preventDefault?.();
        onScrollLeftChange(
          clampScrollLeft(
            scrollLeft + delta * WHEEL_SCROLL_FACTOR,
            viewportWidth,
            layout.stripWidth,
          ),
        );
      }
    },
  };

  return (
    <View
      {...webProps}
      onLayout={handleLayout}
      ref={surfaceRef}
      style={[styles.viewport, { height: keyHeight }]}
      testID="piano-keyboard"
    >
      <View
        pointerEvents="none"
        style={[
          styles.strip,
          {
            height: keyHeight,
            transform: [{ translateX: -scrollLeft }],
            width: layout.stripWidth,
          },
        ]}
      >
        {layout.whiteKeys.map((key) => {
          const label = pianoKeyLabel(key.midi, labelOptions);

          return (
            <View
              key={key.midi}
              style={[
                styles.whiteKey,
                sounding.has(key.midi) ? styles.whiteKeyPressed : null,
                { left: key.left, width: key.width },
              ]}
            >
              {label ? <Text style={styles.whiteLabel}>{label}</Text> : null}
            </View>
          );
        })}
        {layout.blackKeys.map((key) => {
          const label = pianoKeyLabel(key.midi, labelOptions);

          return (
            <View
              key={key.midi}
              style={[
                styles.blackKey,
                sounding.has(key.midi) ? styles.blackKeyPressed : null,
                {
                  height: keyHeight * BLACK_KEY_HEIGHT_RATIO,
                  left: key.left,
                  width: key.width,
                },
              ]}
            >
              {label ? <Text style={styles.blackLabel}>{label}</Text> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  viewport: {
    backgroundColor: colors.neutral[800],
    overflow: 'hidden',
    // The keys own their pointers: the page must not pan or zoom under them.
    touchAction: 'none',
    userSelect: 'none',
  } as never,
  strip: { position: 'absolute', left: 0, top: 0 },
  whiteKey: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    backgroundColor: colors.paper,
    borderColor: colors.neutral[400],
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: radius.nudge,
    borderBottomRightRadius: radius.nudge,
  },
  whiteKeyPressed: { backgroundColor: colors.accentRamp[300] },
  blackKey: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
    backgroundColor: colors.neutral[900],
    borderColor: colors.neutral[600],
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
  },
  blackKeyPressed: { backgroundColor: colors.accent },
  whiteLabel: {
    color: colors.neutral[600],
    fontSize: LABEL_FONT_SIZE,
  },
  blackLabel: {
    color: colors.neutral[200],
    fontSize: LABEL_FONT_SIZE - 1,
  },
});
