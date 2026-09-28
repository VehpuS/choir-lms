import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { appTheme } from '../utils/theme';

type EqualizerMarkProps = {
  style?: StyleProp<ViewStyle>;
};

// Four static accent bars mark the currently playing row (README "Row
// anatomy"); the row's title and meta line carry the state in text too.
const EQUALIZER_BAR_HEIGHTS = [8, 14, 10, 16] as const;
const EQUALIZER_BAR_WIDTH = 3;
const EQUALIZER_BAR_GAP = 2;

export const EqualizerMark = ({ style }: EqualizerMarkProps) => {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.container, style]}
      testID="equalizer-mark"
    >
      {EQUALIZER_BAR_HEIGHTS.map((height, index) => (
        <View key={index} style={[styles.bar, { height }]} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: appTheme.space.touchTarget,
    height: appTheme.space.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: EQUALIZER_BAR_GAP,
  },
  bar: {
    width: EQUALIZER_BAR_WIDTH,
    borderRadius: 1,
    backgroundColor: appTheme.colors.accent,
  },
});
