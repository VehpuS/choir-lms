import { StyleSheet, Text, View } from 'react-native';

import { RECORDINGS_STORAGE_COPY } from '../../library/recording/recordings-storage-model';
import type { RecordingsStorageSummary } from '../../library/recording/recordings-storage-model';
import { useRecordingsStorage } from '../../library/recording/use-recordings-storage';
import { appTheme } from '../../utils/theme';
import { RecordingsAutoExportSection } from './recordings-auto-export-section';

/** What recordings use, and the promise that nothing removes them but you. */
export const RecordingsSection = () => {
  const { isLoading, summary } = useRecordingsStorage();

  return (
    <View style={styles.page}>
      <RecordingsSectionView isLoading={isLoading} summary={summary} />
      <RecordingsAutoExportSection />
    </View>
  );
};

/** The page itself, given its data, so it renders without browser storage. */
export const RecordingsSectionView = ({
  isLoading,
  summary,
}: {
  /** The total stays blank until the first read, so it never flashes 0 B. */
  isLoading: boolean;
  summary: RecordingsStorageSummary;
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>
            {RECORDINGS_STORAGE_COPY.usedTitle}
          </Text>
          <Text style={styles.body}>
            {RECORDINGS_STORAGE_COPY.neverRemovedNote}
          </Text>
        </View>
        {isLoading ? null : (
          <Text
            accessibilityLabel={`Storage used ${summary.totalLabel}`}
            style={styles.total}
          >
            {summary.totalLabel}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { gap: appTheme.space.lg },
  body: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: appTheme.space.md,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: {
    color: appTheme.colors.text,
    fontSize: 15,
    fontWeight: appTheme.fontWeight.medium,
  },
  section: { gap: appTheme.space.lg },
  total: {
    color: appTheme.colors.text,
    fontSize: 15,
  },
});
