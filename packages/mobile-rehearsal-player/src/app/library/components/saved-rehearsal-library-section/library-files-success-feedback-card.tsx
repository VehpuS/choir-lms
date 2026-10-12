import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FeedbackCard } from '../feedback-card';
import type { LibraryFilesSuccessFeedback } from './library-files-success-feedback';
import { appTheme } from '../../../utils/theme';

type LibraryFilesSuccessFeedbackCardProps = {
  feedback: LibraryFilesSuccessFeedback;
  // Wired to the card's interactive controls so an in-flight auto-dismiss
  // timer pauses while the card has focus (e.g. a screen-reader or keyboard
  // user is on it) rather than disappearing out from under them.
  onBlur: () => void;
  onDismiss: () => void;
  onFocus: () => void;
  onOpenFolder: (folderId: string) => void;
};

export const LibraryFilesSuccessFeedbackCard = ({
  feedback,
  onBlur,
  onDismiss,
  onFocus,
  onOpenFolder,
}: LibraryFilesSuccessFeedbackCardProps) => {
  return (
    // The card sits over the explorer and its success tint is translucent, so
    // an opaque base underneath stops the rows behind it showing through.
    <View style={styles.opaqueBase}>
      <FeedbackCard
        footer={
          <View style={styles.actions}>
            {feedback.action ? (
              <Pressable
                accessibilityRole="button"
                onBlur={onBlur}
                onFocus={onFocus}
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
            {feedback.undo ? (
              <Pressable
                accessibilityRole="button"
                onBlur={onBlur}
                onFocus={onFocus}
                onPress={() => {
                  const { run } = feedback.undo ?? {};

                  onDismiss();
                  void run?.();
                }}
                style={styles.secondaryAction}
              >
                <Text style={styles.secondaryActionLabel}>
                  {feedback.undo.label}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onBlur={onBlur}
              onFocus={onFocus}
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
    </View>
  );
};

const styles = StyleSheet.create({
  opaqueBase: {
    backgroundColor: appTheme.colors.bg,
    borderRadius: appTheme.radius.md,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryAction: {
    borderRadius: 999,
    backgroundColor: appTheme.colors.surfaceAccent,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryActionLabel: {
    color: appTheme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryAction: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: appTheme.colors.successEdge,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryActionLabel: {
    color: appTheme.colors.accentText,
    fontSize: 13,
    fontWeight: '700',
  },
});
