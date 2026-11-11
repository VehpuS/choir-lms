import { StyleSheet, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { PageStepButton, type PageSteps } from './page-steps';

type PageRailGroupProps = {
  /** `Previous page` and `Next page`. */
  steps: PageSteps;
};

/**
 * The page step buttons in the compact landscape side rail, side by side to
 * save height. The `Page N of M`
 * chip that opens `Go to page` floats over the page, as it does upright, so
 * the rail carries only the buttons.
 */
export const PageRailGroup = ({ steps }: PageRailGroupProps) => {
  return (
    <View style={styles.group}>
      <PageStepButton direction="previous" steps={steps} />
      <PageStepButton direction="next" steps={steps} />
    </View>
  );
};

/**
 * The rail's page group, or nothing where pages are not turned (the
 * continuous layout) or until the open PDF has reported its pages (`isReady`).
 * It carries a `key` because the toolbar lays it out in a list.
 */
export const buildRailPageGroup = ({
  isReady,
  steps,
}: {
  isReady: boolean;
  steps: PageSteps | undefined;
}) =>
  isReady && steps ? (
    <PageRailGroup key="page-group" steps={steps} />
  ) : undefined;

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
  },
});
