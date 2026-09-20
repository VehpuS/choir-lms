import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../utils/theme';
import type {
  DriveImportCompletionSummary,
  DriveImportOutcome,
} from '../../library/saved-rehearsal-library/drive-import-status';
import {
  buildDriveImportCompletionSummaryRows,
  canRetryDriveImportCompletion,
  getDriveImportCompletionStatusCopy,
  getFailedDriveImportOutcomes,
} from './drive-import-progress-model';

type ImportCompletionSectionProps = {
  onRetryFailed: () => void;
  outcomes: readonly DriveImportOutcome[];
  summary: DriveImportCompletionSummary;
};

export const ImportCompletionSection = ({
  onRetryFailed,
  outcomes,
  summary,
}: ImportCompletionSectionProps) => {
  const [isFailedListExpanded, setIsFailedListExpanded] = useState(false);
  const statusCopy = getDriveImportCompletionStatusCopy(summary.status);
  const rows = buildDriveImportCompletionSummaryRows(summary);
  const failedOutcomes = getFailedDriveImportOutcomes(outcomes);

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
      {failedOutcomes.length > 0 ? (
        <View style={styles.failedSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: isFailedListExpanded }}
            onPress={() => setIsFailedListExpanded((current) => !current)}
          >
            <Text style={styles.failedToggleLabel}>
              {isFailedListExpanded
                ? 'Hide failed items'
                : `Show failed items (${failedOutcomes.length})`}
            </Text>
          </Pressable>
          {isFailedListExpanded ? (
            <View style={styles.failedList}>
              {failedOutcomes.map((outcome) => (
                <View key={outcome.itemId} style={styles.failedItem}>
                  <Text style={styles.failedItemName}>{outcome.itemName}</Text>
                  <Text style={styles.failedItemMessage}>
                    {outcome.errorMessage}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
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
  failedItem: {
    gap: 2,
  },
  failedItemMessage: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    lineHeight: 16,
  },
  failedItemName: {
    color: appTheme.colors.primaryText,
    fontSize: 13,
    fontWeight: '700',
  },
  failedList: {
    gap: 10,
    paddingTop: 4,
  },
  failedSection: {
    gap: 8,
  },
  failedToggleLabel: {
    color: appTheme.colors.listMarker,
    fontSize: 13,
    fontWeight: '700',
  },
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
