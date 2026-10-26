import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';

export const PAGE_INDICATOR_LABEL = 'Go to page';

type PageIndicatorProps = {
  /** Opens the `Go to page` sheet. */
  onPress: () => void;
  /** `Page 3 of 81`. */
  text: string;
};

/**
 * A small button over the bottom of the page area that shows where the reader
 * is and opens `Go to page`. The pill looks small, but its touch area is a
 * full touch target (the pill centered in a transparent wrapper). Only that
 * wrapper takes touches: the rest of the layer lets pinch and double-tap
 * through to the page area.
 */
export const PageIndicator = ({ onPress, text }: PageIndicatorProps) => {
  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <Pressable
        accessibilityLabel={PAGE_INDICATOR_LABEL}
        accessibilityRole="button"
        accessibilityValue={{ text }}
        onPress={onPress}
        style={styles.target}
      >
        <View style={styles.pill}>
          <Text accessibilityLiveRegion="polite" style={styles.text}>
            {text}
          </Text>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: appTheme.space.sm,
    paddingVertical: appTheme.space.xs,
    borderRadius: appTheme.radius.pill,
    backgroundColor: appTheme.colors.scrim,
  },
  // Keeps the touch area at the platform minimum whatever size the pill is.
  target: {
    minWidth: appTheme.space.touchTarget,
    minHeight: appTheme.space.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...appTheme.type.rowMeta,
    color: appTheme.colors.text,
  },
});
