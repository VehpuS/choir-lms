import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { FeedbackCard } from '../../components/feedback-card';
import { type DriveLibraryStatusCopy } from '../utils/drive-library-view-model';

type DriveLibraryStatusCardProps = {
  isLoading: boolean;
  loadingLabel?: string;
  statusCopy: DriveLibraryStatusCopy;
};

const SECONDARY_TEXT = '#5f5647';

export const DriveLibraryStatusCard = ({
  isLoading,
  loadingLabel = 'Refreshing Google Drive…',
  statusCopy,
}: DriveLibraryStatusCardProps) => {
  return (
    <FeedbackCard
      footer={
        isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={SECONDARY_TEXT} size="small" />
            <Text style={styles.loadingLabel}>{loadingLabel}</Text>
          </View>
        ) : null
      }
      message={statusCopy.message}
      messageStyle={styles.statusMessage}
      title={statusCopy.title}
      tone={statusCopy.tone}
    />
  );
};

const styles = StyleSheet.create({
  statusMessage: {
    color: SECONDARY_TEXT,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  loadingLabel: {
    color: SECONDARY_TEXT,
    fontSize: 14,
  },
});
