import type { DriveAuthorizationState } from '@org/google-drive';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { DriveAuthorizationStatusCopy } from '../authorization';
import {
  getDriveSessionDetails,
  getDriveSessionTriggerCopy,
} from '../authorization';

type DriveSessionMenuProps = {
  authState: DriveAuthorizationState;
  canClearAuthorization: boolean;
  canStartAuthorization: boolean;
  isBusy: boolean;
  isVisible: boolean;
  onClearAuthorization: () => void;
  onStartAuthorization: () => void;
  onToggleVisibility: () => void;
  requestReady: boolean;
  statusCopy: DriveAuthorizationStatusCopy;
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

const getStatusBadgeStyle = (tone: DriveAuthorizationStatusCopy['tone']) => {
  if (tone === 'ready') {
    return styles.statusBadgeReady;
  }

  if (tone === 'warning') {
    return styles.statusBadgeWarning;
  }

  if (tone === 'error') {
    return styles.statusBadgeError;
  }

  return styles.statusBadgeNeutral;
};

const getStatusBadgeLabelStyle = (
  tone: DriveAuthorizationStatusCopy['tone'],
) => {
  if (tone === 'ready') {
    return styles.statusBadgeLabelReady;
  }

  if (tone === 'warning') {
    return styles.statusBadgeLabelWarning;
  }

  if (tone === 'error') {
    return styles.statusBadgeLabelError;
  }

  return styles.statusBadgeLabelNeutral;
};

export const DriveSessionMenu = ({
  authState,
  canClearAuthorization,
  canStartAuthorization,
  isBusy,
  isVisible,
  onClearAuthorization,
  onStartAuthorization,
  onToggleVisibility,
  requestReady,
  statusCopy,
}: DriveSessionMenuProps) => {
  const triggerCopy = getDriveSessionTriggerCopy(statusCopy);
  const sessionDetails = getDriveSessionDetails(authState, requestReady);

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Open Drive session menu"
        accessibilityRole="button"
        accessibilityState={{ expanded: isVisible }}
        onPress={onToggleVisibility}
        style={({ pressed }) => [
          styles.trigger,
          getTriggerToneStyle(statusCopy.tone),
          pressed ? styles.triggerPressed : null,
        ]}
        testID="drive-session-trigger"
      >
        <Text style={styles.avatarLabel}>U</Text>
        <View style={[styles.statusDot, getStatusDotStyle(statusCopy.tone)]} />
      </Pressable>

      {isVisible ? (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.panelHeaderCopy}>
              <Text style={styles.panelTitle}>{triggerCopy.title}</Text>
              <Text style={styles.panelBody}>{triggerCopy.body}</Text>
            </View>
            <View
              style={[styles.statusBadge, getStatusBadgeStyle(statusCopy.tone)]}
            >
              <Text
                style={[
                  styles.statusBadgeLabel,
                  getStatusBadgeLabelStyle(statusCopy.tone),
                ]}
              >
                {triggerCopy.status}
              </Text>
            </View>
          </View>

          <View style={styles.detailList}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>{sessionDetails.status}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Expiry</Text>
              <Text style={styles.detailValue}>{sessionDetails.expiry}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Request</Text>
              <Text style={styles.detailValue}>{sessionDetails.request}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={!canStartAuthorization || isBusy}
              onPress={onStartAuthorization}
              style={({ pressed }) => [
                styles.primaryAction,
                pressed && canStartAuthorization && !isBusy
                  ? styles.actionPressed
                  : null,
                !canStartAuthorization || isBusy ? styles.actionDisabled : null,
              ]}
            >
              {isBusy ? (
                <ActivityIndicator color="#fff8ef" size="small" />
              ) : (
                <Text style={styles.primaryActionLabel}>
                  {statusCopy.actionLabel}
                </Text>
              )}
            </Pressable>

            {canClearAuthorization ? (
              <Pressable
                accessibilityRole="button"
                onPress={onClearAuthorization}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  pressed ? styles.actionPressed : null,
                ]}
              >
                <Text style={styles.secondaryActionLabel}>Forget session</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 30,
  },
  trigger: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
  },
  triggerNeutral: {
    borderColor: 'rgba(255, 248, 239, 0.22)',
    backgroundColor: 'rgba(255, 248, 239, 0.08)',
  },
  triggerReady: {
    borderColor: 'rgba(209, 232, 221, 0.28)',
    backgroundColor: 'rgba(209, 232, 221, 0.1)',
  },
  triggerWarning: {
    borderColor: 'rgba(255, 214, 128, 0.35)',
    backgroundColor: 'rgba(255, 214, 128, 0.12)',
  },
  triggerError: {
    borderColor: 'rgba(248, 174, 150, 0.35)',
    backgroundColor: 'rgba(248, 174, 150, 0.12)',
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
  panel: {
    position: 'absolute',
    top: 52,
    right: 0,
    width: 286,
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 20,
    backgroundColor: '#fffdf8',
    shadowColor: '#1f1c17',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  panelHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  panelTitle: {
    color: '#1f1c17',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  panelBody: {
    color: '#5f5647',
    fontSize: 13,
    lineHeight: 18,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusBadgeNeutral: {
    backgroundColor: '#f6f1e7',
  },
  statusBadgeReady: {
    backgroundColor: '#e7f2ec',
  },
  statusBadgeWarning: {
    backgroundColor: '#fff4dd',
  },
  statusBadgeError: {
    backgroundColor: '#fff1ed',
  },
  statusBadgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  statusBadgeLabelNeutral: {
    color: '#1f1c17',
  },
  statusBadgeLabelReady: {
    color: '#1f5c40',
  },
  statusBadgeLabelWarning: {
    color: '#7f5b12',
  },
  statusBadgeLabelError: {
    color: '#8a2d1f',
  },
  detailList: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: {
    color: '#5f5647',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#1f1c17',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  actions: {
    gap: 10,
  },
  primaryAction: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#173229',
  },
  primaryActionLabel: {
    color: '#fff8ef',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryAction: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 14,
    backgroundColor: '#f6f1e7',
  },
  secondaryActionLabel: {
    color: '#1f1c17',
    fontSize: 13,
    fontWeight: '700',
  },
  actionPressed: {
    opacity: 0.85,
  },
  actionDisabled: {
    opacity: 0.55,
  },
});
