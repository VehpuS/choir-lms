import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { appTheme } from '../../../utils/theme';

type ChipRowProps = {
  accessibilityLabel: string;
  children: ReactNode;
};

/** One horizontally scrolling row of chips, kept to the chips' own height. */
export const ChipRow = ({ accessibilityLabel, children }: ChipRowProps) => {
  return (
    <ScrollView
      accessibilityLabel={accessibilityLabel}
      contentContainerStyle={styles.row}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
    >
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    gap: appTheme.space.sm,
  },
  // A horizontal ScrollView grows to fill a column; keep it to its chips' height.
  scroller: {
    flexGrow: 0,
  },
});
