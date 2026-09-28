import { Pressable, StyleSheet, View } from 'react-native';

import type { DriveAuthorizationStatusCopy } from '../../utils/authorization';

import { AppIcon } from '../../../../components/app-icon';
import { appTheme } from '../../../../utils/theme';

const ACCOUNT_ICON_SIZE = 24;

type DriveSessionMenuTriggerProps = {
  isVisible: boolean;
  onToggleVisibility: () => void;
  tone: DriveAuthorizationStatusCopy['tone'];
};

const getStatusDotStyle = (tone: DriveAuthorizationStatusCopy['tone']) => {
  if (tone === 'ready') {
    return styles.statusDotReady;
  }

  if (tone === 'warning') {
    return styles.statusDotWarning;
  }

  if (tone === 'error') {
    return styles.statusDotError;
  }

  return styles.statusDotNeutral;
};

export const DriveSessionMenuTrigger = ({
  isVisible,
  onToggleVisibility,
  tone,
}: DriveSessionMenuTriggerProps) => {
  return (
    <Pressable
      accessibilityLabel="Open Drive session menu"
      accessibilityRole="button"
      accessibilityState={{ expanded: isVisible }}
      onPress={onToggleVisibility}
      style={({ pressed }) => [
        styles.trigger,
        pressed ? styles.triggerPressed : null,
      ]}
      testID="drive-session-trigger"
    >
      <AppIcon
        color={appTheme.colors.icon}
        name="account-circle-outline"
        size={ACCOUNT_ICON_SIZE}
      />
      <View style={[styles.statusDot, getStatusDotStyle(tone)]} />
    </Pressable>
  );
};

// A 44pt neutral-outlined account button (screens 1a, 1b, 1e); the dot keeps
// the Drive session status visible without opening the menu.
const styles = StyleSheet.create({
  trigger: {
    width: appTheme.space.touchTarget,
    height: appTheme.space.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: appTheme.radius.pill,
    borderWidth: 1,
    borderColor: appTheme.colors.borderButton,
    backgroundColor: appTheme.colors.transparent,
  },
  triggerPressed: {
    opacity: 0.88,
  },
  statusDot: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 8,
    height: 8,
    borderRadius: appTheme.radius.pill,
    borderWidth: 1,
    borderColor: appTheme.colors.bg,
  },
  statusDotNeutral: {
    backgroundColor: appTheme.colors.textMuted,
  },
  statusDotReady: {
    backgroundColor: appTheme.colors.success,
  },
  statusDotWarning: {
    backgroundColor: appTheme.colors.warning,
  },
  statusDotError: {
    backgroundColor: appTheme.colors.danger,
  },
});
