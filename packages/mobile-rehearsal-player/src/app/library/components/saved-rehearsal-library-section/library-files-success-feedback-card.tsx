import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FeedbackCard } from '../feedback-card';
import type { LibraryFilesSuccessFeedback } from './library-files-success-feedback';

type LibraryFilesSuccessFeedbackCardProps = {
  feedback: LibraryFilesSuccessFeedback;
  onDismiss: () => void;
  onOpenFolder: (folderId: string) => void;
};

export const LibraryFilesSuccessFeedbackCard = ({
  feedback,
  onDismiss,
  onOpenFolder,
}: LibraryFilesSuccessFeedbackCardProps) => {
  return (
    <FeedbackCard
      footer={
        <View style={styles.actions}>
          {feedback.action ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onOpenFolder(feedback.action?.folderId ?? '');
              }}
              style={styles.primaryAction}
            >
              <Text style={styles.primaryActionLabel}>
                {feedback.action.label}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={onDismiss}
            style={styles.secondaryAction}
          >
            <Text style={styles.secondaryActionLabel}>Dismiss</Text>
          </Pressable>
        </View>
      }
      message={feedback.message}
      size="compact"
      title={feedback.title}
      tone="ready"
    />
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryAction: {
    borderRadius: 999,
    backgroundColor: '#1f5c40',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryActionLabel: {
    color: '#f8fbf7',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryAction: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#abc8b6',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryActionLabel: {
    color: '#1f5c40',
    fontSize: 13,
    fontWeight: '700',
  },
});
