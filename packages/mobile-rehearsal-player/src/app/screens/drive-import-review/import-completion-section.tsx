import { Fragment, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../components/outlined-action-button';
import { FeedbackCard } from '../../library/components/feedback-card';
import type {
  DriveImportCompletionSummary,
  DriveImportOutcome,
} from '../../library/saved-rehearsal-library/drive-import-status';
import { appTheme } from '../../utils/theme';
import {
  buildDriveImportCompletionSummaryRows,
  canRetryDriveImportCompletion,
  getDriveImportCompletionStatusCopy,
  getDriveImportCompletionTone,
  getFailedDriveImportOutcomes,
} from './drive-import-progress-model';
import { ImportCountRows } from './import-count-rows';

const { colors, space } = appTheme;

type ImportCompletionSectionProps = {
  onRetryFailed: () => void;
  outcomes: readonly DriveImportOutcome[];
  summary: DriveImportCompletionSummary;
};

// Completion (design Decision 8): the outcome as a toned status card like 1e's
// save acknowledgment, per-outcome counts, an expandable list of failed items
// with their reasons, and `Retry failed` as the accent-outlined primary.
export const ImportCompletionSection = ({
  onRetryFailed,
  outcomes,
  summary,
}: ImportCompletionSectionProps) => {
  const [isFailedListExpanded, setIsFailedListExpanded] = useState(false);
  const statusCopy = getDriveImportCompletionStatusCopy(summary.status);
  const failedOutcomes = getFailedDriveImportOutcomes(outcomes);

  return (
    <View style={styles.section}>
      <FeedbackCard
        message={statusCopy.description}
        title={statusCopy.title}
        tone={getDriveImportCompletionTone(summary.status)}
      />
      <ImportCountRows rows={buildDriveImportCompletionSummaryRows(summary)} />
      {failedOutcomes.length > 0 ? (
        <View style={styles.failedSection}>
          <OutlinedActionButton
            icon={isFailedListExpanded ? 'chevron-up' : 'chevron-down'}
            label={
              isFailedListExpanded
                ? 'Hide failed items'
                : `Show failed items (${failedOutcomes.length})`
            }
            onPress={() => setIsFailedListExpanded((current) => !current)}
            style={styles.failedToggle}
          />
          {isFailedListExpanded ? (
            <View>
              {failedOutcomes.map((outcome, index) => (
                <Fragment key={outcome.itemId}>
                  {index > 0 ? <View style={styles.separator} /> : null}
                  <View style={styles.failedItem}>
                    <Text style={styles.failedItemName}>
                      {outcome.itemName}
                    </Text>
                    <Text style={styles.failedItemMessage}>
                      {outcome.errorMessage}
                    </Text>
                  </View>
                </Fragment>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
      {canRetryDriveImportCompletion(summary) ? (
        <OutlinedActionButton
          label="Retry failed"
          onPress={onRetryFailed}
          variant="accent"
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  failedItem: {
    gap: 2,
    paddingVertical: space.xs,
  },
  failedItemMessage: {
    ...appTheme.type.rowMeta,
    color: colors.danger,
  },
  failedItemName: {
    ...appTheme.type.rowTitle,
    color: colors.text,
  },
  failedSection: {
    gap: space.xs,
  },
  failedToggle: {
    alignSelf: 'flex-start',
  },
  section: {
    gap: space.md,
  },
  separator: {
    height: 1,
    backgroundColor: colors.hairline,
  },
});
