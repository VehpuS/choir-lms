import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { INTERACTION_STATE_OPACITY } from '../../library/components/interaction-style-tokens';
import { appTheme } from '../../utils/theme';
import type { DriveTrackSavedFeedback } from './drive-track-saved-feedback';

const { colors, space } = appTheme;
const CHECK_ICON_SIZE = 20;

type DriveTrackSavedFeedbackCardProps = {
  feedback: DriveTrackSavedFeedback;
  // Wired to the card's interactive controls so an in-flight auto-dismiss
  // timer pauses while the card has focus (e.g. a screen-reader or keyboard
  // user is on it) rather than disappearing out from under them.
  onBlur: () => void;
  onDismiss: () => void;
  onFocus: () => void;
};

// Screen 1e's save acknowledgment: an opaque card with an accent edge, a
// filled check, `Saved to Library` over the file name, and an explicit
// Dismiss (mobile-rehearsal-player-usability requires one; 1e's `Open` is
// not built).
export const DriveTrackSavedFeedbackCard = ({
  feedback,
  onBlur,
  onDismiss,
  onFocus,
}: DriveTrackSavedFeedbackCardProps) => {
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="summary"
      style={styles.card}
    >
      <AppIcon
        color={colors.accentText}
        name="check-circle"
        size={CHECK_ICON_SIZE}
      />
      <View style={styles.copy}>
        <Text style={styles.title}>{feedback.title}</Text>
        <Text numberOfLines={1} style={styles.message}>
          {feedback.message}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={`Dismiss ${feedback.title}`}
        accessibilityRole="button"
        onBlur={onBlur}
        onFocus={onFocus}
        onPress={onDismiss}
        style={({ pressed }) => [
          styles.dismissAction,
          pressed ? styles.pressed : undefined,
        ]}
      >
        <Text style={styles.dismissLabel}>Dismiss</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.xs,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    borderWidth: 1,
    borderColor: colors.accentBorderDeep,
    borderRadius: appTheme.radius.md,
    backgroundColor: colors.surface,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  dismissAction: {
    minWidth: space.touchTarget,
    minHeight: space.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  dismissLabel: {
    ...appTheme.type.button,
    color: colors.accentText,
  },
  message: {
    ...appTheme.type.rowMeta,
    fontSize: 13,
  },
  pressed: {
    opacity: INTERACTION_STATE_OPACITY.pressed,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: appTheme.fontWeight.medium,
  },
});
