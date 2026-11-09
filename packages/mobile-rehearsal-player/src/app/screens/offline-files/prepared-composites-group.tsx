import { StyleSheet, Text, View } from 'react-native';

import {
  PREPARED_COMPOSITES_COPY,
  type PreparedCompositesSummary,
} from '../../library/composite/prepared/prepared-composites-model';
import { appTheme } from '../../utils/theme';

type PreparedCompositesGroupProps = {
  summary: PreparedCompositesSummary;
};

/**
 * Prepared composite stems in their own group, apart from track audio: each
 * composite with its stem count and size. They are a cache that `Clear all`
 * clears and that is made again on the next play, so there is no per-row action.
 */
export const PreparedCompositesGroup = ({
  summary,
}: PreparedCompositesGroupProps) => {
  if (summary.count === 0) {
    return null;
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>
        {PREPARED_COMPOSITES_COPY.groupTitle}
      </Text>
      <Text style={styles.groupLine}>{summary.groupLine}</Text>
      {summary.rows.map((row) => (
        <View key={row.compositeId} style={styles.row}>
          <View style={styles.rowText}>
            <Text numberOfLines={1} style={styles.name}>
              {row.name}
            </Text>
            <Text numberOfLines={1} style={styles.detail}>
              {row.stemsLabel}
            </Text>
          </View>
          <Text style={styles.size}>{row.sizeLabel}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  detail: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
  },
  groupLine: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    paddingBottom: appTheme.space.xs,
  },
  name: {
    color: appTheme.colors.text,
    fontSize: 16,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: appTheme.colors.borderSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: appTheme.space.md,
    minHeight: 56,
    paddingVertical: appTheme.space.sm,
  },
  rowText: { flex: 1 },
  sectionTitle: {
    ...appTheme.type.kicker,
    color: appTheme.colors.textMuted,
    paddingBottom: appTheme.space.xs,
  },
  size: {
    color: appTheme.colors.textMuted,
    fontSize: 14,
  },
});
