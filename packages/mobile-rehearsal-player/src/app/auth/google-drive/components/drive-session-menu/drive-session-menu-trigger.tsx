import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DriveAuthorizationStatusCopy } from '../../utils/authorization';

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
    borderColor: 'rgba(255, 248, 239, 0.38)',
    backgroundColor: 'rgba(255, 248, 239, 0.16)',
  },
  triggerReady: {
    borderColor: 'rgba(209, 232, 221, 0.46)',
    backgroundColor: 'rgba(209, 232, 221, 0.2)',
  },
  triggerWarning: {
    borderColor: 'rgba(255, 214, 128, 0.48)',
    backgroundColor: 'rgba(255, 214, 128, 0.22)',
  },
  triggerError: {
    borderColor: 'rgba(248, 174, 150, 0.48)',
    backgroundColor: 'rgba(248, 174, 150, 0.2)',
  },
  triggerPressed: {
    opacity: 0.88,
  },
  avatarLabel: {
    color: '#fff8ef',
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
    borderColor: '#173229',
  },
  statusDotNeutral: {
    backgroundColor: '#fff8ef',
  },
  statusDotReady: {
    backgroundColor: '#8fd3af',
  },
  statusDotWarning: {
    backgroundColor: '#ffd27d',
  },
  statusDotError: {
    backgroundColor: '#f7a694',
  },
});
