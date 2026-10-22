import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../utils/theme';
import { interactionGuardProps } from '../interaction-guard';
import {
  MARKER_FLAG_HIT_RADIUS,
  type WaveformFlag,
} from './marker-flags-model';

type MarkerFlagsLayerProps = {
  flags: readonly WaveformFlag[];
  /** Waveform width, to keep the press label inside it. */
  width: number;
  onFlagLongPress?: (flag: WaveformFlag) => void;
  onFlagPress?: (flag: WaveformFlag) => void;
};

const FLAG_LINE_WIDTH = 2;
const FLAG_HEAD_SIZE = 7;
const DERIVED_TICK_HEIGHT = '45%';
const LABEL_MAX_WIDTH = 200;

/**
 * Marker flags over the waveform bars: the user's markers as a full-height
 * accent hairline with a small head, loop boundaries as a shorter dim tick.
 * No permanent labels; pressing a flag names it. Each flag is a button for
 * assistive technology. It draws over the bars without taking layout space.
 */
export const MarkerFlagsLayer = ({
  flags,
  width,
  onFlagLongPress,
  onFlagPress,
}: MarkerFlagsLayerProps) => {
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const pressed = flags.find(({ key }) => key === pressedKey);

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      {flags.map((flag) => {
        const isExplicit = flag.kind === 'explicit';

        return (
          <Pressable
            accessibilityLabel={flag.accessibilityLabel}
            accessibilityRole="button"
            {...interactionGuardProps}
            key={flag.key}
            onLongPress={() => {
              onFlagLongPress?.(flag);
            }}
            onPress={() => {
              onFlagPress?.(flag);
            }}
            onPressIn={() => {
              setPressedKey(flag.key);
            }}
            onPressOut={() => {
              setPressedKey(null);
            }}
            style={[styles.hitArea, { left: flag.x - MARKER_FLAG_HIT_RADIUS }]}
          >
            <View
              style={[
                styles.line,
                isExplicit ? styles.explicitLine : styles.derivedTick,
              ]}
            />
            {isExplicit ? <View style={styles.head} /> : null}
          </Pressable>
        );
      })}
      {pressed ? (
        <View
          pointerEvents="none"
          style={[
            styles.label,
            // Anchor toward the middle so the name never leaves the waveform.
            pressed.x > width / 2
              ? { right: width - pressed.x }
              : { left: pressed.x },
          ]}
        >
          <Text numberOfLines={1} style={styles.labelText}>
            {pressed.name}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  derivedTick: {
    height: DERIVED_TICK_HEIGHT,
    backgroundColor: appTheme.colors.textFaint,
  },
  explicitLine: {
    flex: 1,
    backgroundColor: appTheme.colors.accentText,
  },
  head: {
    position: 'absolute',
    top: 0,
    left: MARKER_FLAG_HIT_RADIUS,
    width: FLAG_HEAD_SIZE,
    height: FLAG_HEAD_SIZE,
    borderTopRightRadius: appTheme.radius.sm,
    borderBottomRightRadius: appTheme.radius.sm,
    backgroundColor: appTheme.colors.accentText,
  },
  hitArea: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: MARKER_FLAG_HIT_RADIUS * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    top: 0,
    maxWidth: LABEL_MAX_WIDTH,
    borderRadius: appTheme.radius.sm,
    paddingHorizontal: appTheme.space.xs,
    paddingVertical: 2,
    backgroundColor: appTheme.colors.surfaceRaised,
  },
  labelText: {
    ...appTheme.type.chip,
    color: appTheme.colors.text,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  line: {
    width: FLAG_LINE_WIDTH,
    borderRadius: appTheme.radius.pill,
  },
});
