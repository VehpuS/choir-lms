import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  resolveOptionsMenuSheetActions,
  type OptionsMenuAction,
  type ResolvedOptionsMenuAction,
} from '../utils/options-menu-sheet-view-model';

type OptionsMenuSheetProps = {
  actions: OptionsMenuAction[];
  isVisible: boolean;
  title: string;
  secondaryActionLabel?: string;
  onClose: () => void;
  onSecondaryAction?: () => void;
  isSecondaryDisabled?: boolean;
};

const BACKDROP = 'rgba(20, 18, 13, 0.42)';
const CARD_BACKGROUND = '#fffdf8';
const PRIMARY_ACTION_BACKGROUND = '#305c4d';
const PRIMARY_ACTION_TEXT = '#fff8ef';
const PRIMARY_TEXT = '#1f1c17';
const SECONDARY_ACTION_BACKGROUND = '#f2ece1';
const SECONDARY_TEXT = '#5f5647';
const DESTRUCTIVE_ACTION_BACKGROUND = '#fff1ed';
const DESTRUCTIVE_ACTION_TEXT = '#8a2d1f';

const getActionContainerStyle = (tone: ResolvedOptionsMenuAction['tone']) => {
  switch (tone) {
    case 'primary':
      return styles.primaryAction;
    case 'destructive':
      return styles.destructiveAction;
    default:
      return styles.secondaryAction;
  }
};

const getActionLabelStyle = (tone: ResolvedOptionsMenuAction['tone']) => {
  switch (tone) {
    case 'primary':
      return styles.primaryActionLabel;
    case 'destructive':
      return styles.destructiveActionLabel;
    default:
      return styles.secondaryActionLabel;
  }
};

export const OptionsMenuSheet = ({
  actions,
  isVisible,
  title,
  secondaryActionLabel = 'Cancel',
  onClose,
  onSecondaryAction,
  isSecondaryDisabled = false,
}: OptionsMenuSheetProps) => {
  if (!isVisible) {
    return null;
  }

  const resolvedActions = resolveOptionsMenuSheetActions(actions);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.sheetOverlay}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.sheet}>
          <View style={styles.copyGroup}>
            <Text style={styles.eyebrow}>More options</Text>
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>
          </View>

          <View style={styles.actionColumn}>
            {resolvedActions.map((action) => {
              return (
                <Pressable
                  accessibilityRole="button"
                  disabled={action.disabled}
                  key={action.id}
                  onPress={action.onPress}
                  style={({ pressed }) => [
                    getActionContainerStyle(action.tone),
                    pressed && !action.disabled
                      ? styles.buttonPressed
                      : undefined,
                    action.disabled ? styles.buttonDisabled : undefined,
                  ]}
                >
                  <Text style={getActionLabelStyle(action.tone)}>
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              disabled={isSecondaryDisabled}
              onPress={onSecondaryAction ?? onClose}
              style={({ pressed }) => [
                styles.secondaryAction,
                pressed && !isSecondaryDisabled
                  ? styles.buttonPressed
                  : undefined,
                isSecondaryDisabled ? styles.buttonDisabled : undefined,
              ]}
            >
              <Text style={styles.secondaryActionLabel}>
                {secondaryActionLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  actionColumn: {
    gap: 10,
  },
  backdrop: {
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.56,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  copyGroup: {
    gap: 6,
  },
  eyebrow: {
    color: SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  primaryAction: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: PRIMARY_ACTION_BACKGROUND,
  },
  primaryActionLabel: {
    color: PRIMARY_ACTION_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  destructiveAction: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: DESTRUCTIVE_ACTION_BACKGROUND,
  },
  destructiveActionLabel: {
    color: DESTRUCTIVE_ACTION_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryAction: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: SECONDARY_ACTION_BACKGROUND,
  },
  secondaryActionLabel: {
    color: PRIMARY_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  sheet: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: CARD_BACKGROUND,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: BACKDROP,
  },
  title: {
    color: PRIMARY_TEXT,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
});
