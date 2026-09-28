import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { appTheme } from '../utils/theme';

type FadedRuleProps = {
  style?: StyleProp<ViewStyle>;
};

// Nocturne rules fade to transparent over 40pt at each end (README "Color");
// row separators use the plain hairline instead.
const FADE_LENGTH = 40;
const RULE_HEIGHT = 1;
const RULE_OPACITY = 0.12;
const LEADING_GRADIENT_ID = 'faded-rule-leading';
const TRAILING_GRADIENT_ID = 'faded-rule-trailing';

const FadeEnd = ({
  gradientId,
  reversed,
}: {
  gradientId: string;
  reversed: boolean;
}) => {
  return (
    <Svg height={RULE_HEIGHT} width={FADE_LENGTH}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
          <Stop
            offset="0"
            stopColor={appTheme.colors.text}
            stopOpacity={reversed ? RULE_OPACITY : 0}
          />
          <Stop
            offset="1"
            stopColor={appTheme.colors.text}
            stopOpacity={reversed ? 0 : RULE_OPACITY}
          />
        </LinearGradient>
      </Defs>
      <Rect
        fill={`url(#${gradientId})`}
        height={RULE_HEIGHT}
        width={FADE_LENGTH}
      />
    </Svg>
  );
};

export const FadedRule = ({ style }: FadedRuleProps) => {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.rule, style]}
    >
      <FadeEnd gradientId={LEADING_GRADIENT_ID} reversed={false} />
      <View style={styles.middle} />
      <FadeEnd gradientId={TRAILING_GRADIENT_ID} reversed />
    </View>
  );
};

const styles = StyleSheet.create({
  rule: {
    flexDirection: 'row',
    height: RULE_HEIGHT,
  },
  middle: {
    flex: 1,
    backgroundColor: appTheme.colors.borderTile,
  },
});
