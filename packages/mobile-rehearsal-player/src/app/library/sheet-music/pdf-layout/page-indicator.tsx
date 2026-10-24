import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';

type PageIndicatorProps = {
  /** `Page 3 of 81`. */
  text: string;
};

/** A small label over the bottom of the page area; it never takes a touch. */
export const PageIndicator = ({ text }: PageIndicatorProps) => {
  return (
    <View pointerEvents="none" style={styles.layer}>
      <View style={styles.pill}>
        <Text accessibilityLiveRegion="polite" style={styles.text}>
          {text}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: appTheme.space.sm,
  },
  pill: {
    paddingHorizontal: appTheme.space.sm,
    paddingVertical: appTheme.space.xxs,
    borderRadius: appTheme.radius.pill,
    backgroundColor: appTheme.colors.scrim,
  },
  text: {
    ...appTheme.type.rowMeta,
    color: appTheme.colors.text,
  },
});
