import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { PAGE_INDICATOR_LABEL } from './page-indicator';
import { PageStepButton, type PageSteps } from './page-steps';

type PageRailGroupProps = {
  /** Opens the `Go to page` sheet. */
  onPress: () => void;
  /** `Previous page` and `Next page` around the label; absent where pages are not turned. */
  steps?: PageSteps;
  /** `3/81`. */
  text: string;
};

/**
 * The page controls in the compact landscape side rail: `Previous page`, a
 * short `3/81` label that opens `Go to page`, and `Next page`. The rail is too
 * narrow for the pill that floats over the page elsewhere.
 */
export const PageRailGroup = ({ onPress, steps, text }: PageRailGroupProps) => {
  return (
    <View style={styles.group}>
      {steps ? <PageStepButton direction="previous" steps={steps} /> : null}
      <Pressable
        accessibilityLabel={PAGE_INDICATOR_LABEL}
        accessibilityRole="button"
        accessibilityValue={{ text }}
        onPress={onPress}
        style={styles.label}
      >
        <Text accessibilityLiveRegion="polite" style={styles.text}>
          {text}
        </Text>
      </Pressable>
      {steps ? <PageStepButton direction="next" steps={steps} /> : null}
    </View>
  );
};

/**
 * The rail's page group, or nothing until the open PDF has reported its pages
 * (`shortIndicator`) and `Go to page` can open (`onOpen`). It carries a `key`
 * because the toolbar lays it out in a list.
 */
export const buildRailPageGroup = ({
  onOpen,
  shortIndicator,
  steps,
}: {
  onOpen: (() => void) | undefined;
  shortIndicator: string | undefined;
  steps: PageSteps | undefined;
}) =>
  shortIndicator && onOpen ? (
    <PageRailGroup
      key="page-group"
      onPress={onOpen}
      steps={steps}
      text={shortIndicator}
    />
  ) : undefined;

const styles = StyleSheet.create({
  group: {
    alignItems: 'center',
    gap: appTheme.space.xs,
  },
  // Keeps the touch area at the platform minimum whatever the text is.
  label: {
    minHeight: appTheme.space.touchTarget,
    minWidth: appTheme.space.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...appTheme.type.rowMeta,
    color: appTheme.colors.text,
  },
});
