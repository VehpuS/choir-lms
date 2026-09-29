import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { FeedbackCard } from '../../components/feedback-card';
import { type DriveLibraryStatusCopy } from '../utils/drive-library-view-model';
import { appTheme } from '../../../utils/theme';

type DriveLibraryStatusCardProps = {
  isLoading: boolean;
  loadingLabel?: string;
  statusCopy: DriveLibraryStatusCopy;
};

const SECONDARY_TEXT = appTheme.colors.textMuted;

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

const BODY_LINE_HEIGHT = 20;

// Progressive and incomplete-discovery status (design Decision 8) sits on the
// shared FeedbackCard; only the muted body copy and spinner row are local.
const styles = StyleSheet.create({
  statusMessage: {
    ...appTheme.type.body,
    color: SECONDARY_TEXT,
    lineHeight: BODY_LINE_HEIGHT,
  },
  loadingRow: {
    flexDirection: 'row',
    gap: appTheme.space.sm,
    alignItems: 'center',
  },
  loadingLabel: {
    ...appTheme.type.body,
    color: SECONDARY_TEXT,
  },
});
