import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../utils/theme';
import type { DriveImportControllerState } from '../../library/saved-rehearsal-library/use-drive-import-controller';
import { buildDriveImportReviewSummaryRows } from './drive-import-review-model';
import { ImportCompletionSection } from './import-completion-section';
import { ImportProgressSection } from './import-progress-section';
import { getDriveImportReviewSummaryStatusCopy } from './screen-copy';

type SummaryCountsSectionProps = {
  driveImportState: DriveImportControllerState;
  onRetryFailed: () => void;
};

export const SummaryCountsSection = ({
  driveImportState,
  onRetryFailed,
}: SummaryCountsSectionProps) => {
  switch (driveImportState.status) {
    case 'idle':
      return (
        <Text style={styles.helper}>
          {getDriveImportReviewSummaryStatusCopy('idle')}
        </Text>
      );
    case 'preparing':
    case 'executing':
      return <ImportProgressSection progress={driveImportState.progress} />;
    case 'error':
      return <Text style={styles.errorText}>{driveImportState.message}</Text>;
    case 'review': {
      const rows = buildDriveImportReviewSummaryRows(
        driveImportState.reviewSummary,
      );

      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Import summary</Text>
          {rows.map((row) => (
            <View key={row.key} style={styles.row}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      );
    }
    case 'completed':
      return (
        <ImportCompletionSection
          onRetryFailed={onRetryFailed}
          outcomes={driveImportState.result.outcomes}
          summary={driveImportState.result.summary}
        />
      );
  }
};

const styles = StyleSheet.create({
  errorText: {
    color: appTheme.colors.primaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  helper: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
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
  section: {
    gap: 4,
  },
  sectionTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
});
