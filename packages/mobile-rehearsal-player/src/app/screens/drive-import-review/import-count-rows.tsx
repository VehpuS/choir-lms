import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../utils/theme';

const { colors, space } = appTheme;

type ImportCountRow = {
  key: string;
  label: string;
  value: number;
};

type ImportCountRowsProps = {
  rows: readonly ImportCountRow[];
};

// Label / count rows for the review summary and the completion summary:
// hairline-divided like 1e rows, with counts in the monospace numeric face.
// A zero count stays listed (every outcome kind is always reported) but dims.
export const ImportCountRows = ({ rows }: ImportCountRowsProps) => {
  return (
    <View>
      {rows.map((row, index) => {
        const isZero = row.value === 0;

        return (
          <Fragment key={row.key}>
            {index > 0 ? <View style={styles.separator} /> : null}
            <View style={styles.row}>
              <Text style={[styles.label, isZero && styles.dimmed]}>
                {row.label}
              </Text>
              <Text style={[styles.value, isZero && styles.dimmed]}>
                {row.value}
              </Text>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
};

const ROW_MIN_HEIGHT = 36;

const styles = StyleSheet.create({
  dimmed: {
    color: colors.textMuted,
  },
  label: {
    ...appTheme.type.body,
    flex: 1,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: ROW_MIN_HEIGHT,
  },
  separator: {
    height: 1,
    backgroundColor: colors.hairline,
  },
  value: {
    ...appTheme.type.body,
    color: colors.text,
    fontFamily: appTheme.fontFamily.mono,
  },
});
