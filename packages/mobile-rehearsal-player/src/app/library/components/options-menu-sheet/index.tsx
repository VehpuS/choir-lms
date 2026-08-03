import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheetSurface } from '../bottom-sheet-surface';
import {
  INTERACTION_ACTION_BUTTON_TOKENS,
  INTERACTION_STATE_OPACITY,
} from '../interaction-style-tokens';
import {
  resolveOptionsMenuSheetActions,
  type OptionsMenuAction,
  type ResolvedOptionsMenuAction,
} from './model';

type OptionsMenuSheetProps = {
  actions: OptionsMenuAction[];
  children?: ReactNode;
  isVisible: boolean;
  title: string;
  secondaryActionLabel?: string;
  onClose: () => void;
  onSecondaryAction?: () => void;
  isSecondaryDisabled?: boolean;
};

const PRIMARY_TEXT = '#1f1c17';

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
  children,
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
    <BottomSheetSurface
      eyebrow="More options"
      isVisible
      onClose={onClose}
      title={title}
    >
      <View style={styles.contentColumn}>
        {children ? <View>{children}</View> : null}
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
    </BottomSheetSurface>
  );
};

const styles = StyleSheet.create({
  actionColumn: {
    gap: 10,
  },
  contentColumn: {
    gap: 12,
  },
  buttonDisabled: {
    opacity: INTERACTION_STATE_OPACITY.disabled,
  },
  buttonPressed: {
    opacity: INTERACTION_STATE_OPACITY.pressed,
  },
  primaryAction: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: INTERACTION_ACTION_BUTTON_TOKENS.primary.background,
  },
  primaryActionLabel: {
    color: INTERACTION_ACTION_BUTTON_TOKENS.primary.text,
    fontSize: 13,
    fontWeight: '700',
  },
  destructiveAction: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: INTERACTION_ACTION_BUTTON_TOKENS.destructive.background,
  },
  destructiveActionLabel: {
    color: INTERACTION_ACTION_BUTTON_TOKENS.destructive.text,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryAction: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: INTERACTION_ACTION_BUTTON_TOKENS.secondary.background,
  },
  secondaryActionLabel: {
    color: PRIMARY_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
});
