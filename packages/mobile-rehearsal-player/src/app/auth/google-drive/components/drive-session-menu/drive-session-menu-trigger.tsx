import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DriveAuthorizationStatusCopy } from '../../utils/authorization';

import { appTheme } from '../../../../utils/theme';

type DriveSessionMenuTriggerProps = {
  isVisible: boolean;
  onToggleVisibility: () => void;
  tone: DriveAuthorizationStatusCopy['tone'];
};

const getTriggerToneStyle = (tone: DriveAuthorizationStatusCopy['tone']) => {
  if (tone === 'ready') {
    return styles.triggerReady;
  }

  if (tone === 'warning') {
    return styles.triggerWarning;
  }

  if (tone === 'error') {
    return styles.triggerError;
  }

  return styles.triggerNeutral;
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
        getTriggerToneStyle(tone),
        pressed ? styles.triggerPressed : null,
      ]}
      testID="drive-session-trigger"
    >
      <Text style={styles.avatarLabel}>U</Text>
      <View style={[styles.statusDot, getStatusDotStyle(tone)]} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  trigger: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
  },
  triggerNeutral: {
    borderColor: appTheme.colors.borderButton,
    backgroundColor: appTheme.colors.surface,
  },
  triggerReady: {
    borderColor: appTheme.colors.successEdge,
    backgroundColor: appTheme.colors.successFill,
  },
  triggerWarning: {
    borderColor: appTheme.colors.warningEdge,
    backgroundColor: appTheme.colors.warningFill,
  },
  triggerError: {
    borderColor: appTheme.colors.dangerEdge,
    backgroundColor: appTheme.colors.dangerFill,
  },
  triggerPressed: {
    opacity: 0.88,
  },
  avatarLabel: {
    color: appTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  statusDot: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    width: 8,
    height: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: appTheme.colors.surfaceRaised,
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
