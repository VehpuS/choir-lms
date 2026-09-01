import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FeedbackCard } from '../../library/components/feedback-card';
import type { DriveTrackSavedFeedback } from './drive-track-saved-feedback';

type DriveTrackSavedFeedbackCardProps = {
  feedback: DriveTrackSavedFeedback;
  // Wired to the card's interactive controls so an in-flight auto-dismiss
  // timer pauses while the card has focus (e.g. a screen-reader or keyboard
  // user is on it) rather than disappearing out from under them.
  onBlur: () => void;
  onDismiss: () => void;
  onFocus: () => void;
};

export const DriveTrackSavedFeedbackCard = ({
  feedback,
  onBlur,
  onDismiss,
  onFocus,
}: DriveTrackSavedFeedbackCardProps) => {
  return (
    <FeedbackCard
      footer={
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onBlur={onBlur}
            onFocus={onFocus}
            onPress={onDismiss}
            style={styles.dismissAction}
          >
            <Text style={styles.dismissActionLabel}>Dismiss</Text>
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
  dismissAction: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#abc8b6',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dismissActionLabel: {
    color: '#1f5c40',
    fontSize: 13,
    fontWeight: '700',
  },
});
