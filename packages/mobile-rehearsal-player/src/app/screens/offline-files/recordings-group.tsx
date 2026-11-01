import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../components/outlined-action-button';
import {
  RECORDINGS_STORAGE_COPY,
  getDeleteRecordingConfirmation,
  type RecordingStorageRow,
  type RecordingsStorageSummary,
} from '../../library/recording/recordings-storage-model';
import type { LibraryFilesConfirmationDialogContent } from '../../library/selection/library-files-confirmation-dialog';
import { appTheme } from '../../utils/theme';

type RecordingsGroupProps = {
  onDelete: (id: string) => Promise<void>;
  requestConfirmation: (options: {
    content: LibraryFilesConfirmationDialogContent;
    onConfirm: () => Promise<void> | void;
  }) => void;
  summary: RecordingsStorageSummary;
};

/**
 * Recordings in their own group, apart from track audio: their sizes and a
 * delete action only. They are never cache, never selectable with the files
 * above, and not touched by `Clear all`.
 */
export const RecordingsGroup = ({
  onDelete,
  requestConfirmation,
  summary,
}: RecordingsGroupProps) => {
  if (summary.count === 0) {
    return null;
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>
        {RECORDINGS_STORAGE_COPY.groupTitle}
      </Text>
      <Text style={styles.groupLine}>{summary.groupLine}</Text>
      {summary.rows.map((row: RecordingStorageRow) => (
        <View key={row.id} style={styles.row}>
          <View style={styles.rowText}>
            <Text numberOfLines={1} style={styles.name}>
              {row.name}
            </Text>
            <Text numberOfLines={1} style={styles.track}>
              {row.trackName}
            </Text>
          </View>
          <Text style={styles.size}>{row.sizeLabel}</Text>
          <OutlinedActionButton
            accessibilityLabel={`${RECORDINGS_STORAGE_COPY.deleteLabel} ${row.name}`}
            label={RECORDINGS_STORAGE_COPY.deleteLabel}
            onPress={() => {
              requestConfirmation({
                content: getDeleteRecordingConfirmation(row),
                onConfirm: () => onDelete(row.id),
              });
            }}
            variant="destructive"
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
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
  track: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
  },
});
