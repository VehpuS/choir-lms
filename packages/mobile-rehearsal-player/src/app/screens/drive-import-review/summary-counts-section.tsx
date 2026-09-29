import { StyleSheet, Text, View } from 'react-native';

import { FeedbackCard } from '../../library/components/feedback-card';
import { SectionHeading } from '../../library/components/section-heading';
import type { DriveImportControllerState } from '../../library/saved-rehearsal-library/use-drive-import-controller';
import { appTheme } from '../../utils/theme';
import { buildDriveImportReviewSummaryRows } from './drive-import-review-model';
import { ImportCompletionSection } from './import-completion-section';
import { ImportCountRows } from './import-count-rows';
import { ImportProgressSection } from './import-progress-section';
import { getDriveImportReviewSummaryStatusCopy } from './screen-copy';

const SUMMARY_TITLE = 'Import summary';

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
      return (
        <FeedbackCard
          message={driveImportState.message}
          title={getDriveImportReviewSummaryStatusCopy('error')}
          tone="error"
        />
      );
    case 'review':
      return (
        <View style={styles.section}>
          <SectionHeading eyebrow={SUMMARY_TITLE} />
          <ImportCountRows
            rows={buildDriveImportReviewSummaryRows(
              driveImportState.reviewSummary,
            )}
          />
        </View>
      );
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
  helper: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
  },
  section: {
    gap: appTheme.space.xs,
  },
});
