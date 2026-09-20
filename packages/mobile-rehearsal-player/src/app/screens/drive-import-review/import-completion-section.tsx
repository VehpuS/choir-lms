import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../utils/theme';
import type { DriveImportCompletionSummary } from '../../library/saved-rehearsal-library/drive-import-status';
import {
  buildDriveImportCompletionSummaryRows,
  canRetryDriveImportCompletion,
  getDriveImportCompletionStatusCopy,
} from './drive-import-progress-model';

type ImportCompletionSectionProps = {
  onRetryFailed: () => void;
  summary: DriveImportCompletionSummary;
};

export const ImportCompletionSection = ({
  onRetryFailed,
  summary,
}: ImportCompletionSectionProps) => {
  const statusCopy = getDriveImportCompletionStatusCopy(summary.status);
  const rows = buildDriveImportCompletionSummaryRows(summary);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{statusCopy.title}</Text>
        <Text style={styles.helper}>{statusCopy.description}</Text>
      </View>
      <View style={styles.rows}>
        {rows.map((row) => (
          <View key={row.key} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={styles.rowValue}>{row.value}</Text>
          </View>
        ))}
      </View>
      {canRetryDriveImportCompletion(summary) ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetryFailed}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonLabel}>Retry failed</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    gap: 4,
  },
  helper: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: appTheme.colors.listMarker,
  },
  retryButtonLabel: {
    color: '#fff8ef',
    fontSize: 14,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 32,
    alignItems: 'center',
  },
  rowLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 14,
  },
  rowValue: {
    color: appTheme.colors.primaryText,
    fontSize: 14,
    fontWeight: '700',
  },
  rows: {
    gap: 4,
  },
  section: {
    gap: 16,
  },
  title: {
    color: appTheme.colors.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
});
