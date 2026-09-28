import type { DriveAuthorizationState } from '@org/google-drive';
import { StyleSheet, Text, View } from 'react-native';

import type { DriveAuthorizationStatusCopy } from '../../utils/authorization';
import {
  getDriveSessionDetails,
  getDriveSessionTriggerCopy,
} from '../../utils/authorization';

import { OutlinedActionButton } from '../../../../components/outlined-action-button';
import { appTheme } from '../../../../utils/theme';

type DriveSessionMenuPanelProps = {
  authState: DriveAuthorizationState;
  canClearAuthorization: boolean;
  canStartAuthorization: boolean;
  isBusy: boolean;
  onClearAuthorization: () => void;
  onStartAuthorization: () => void;
  requestReady: boolean;
  statusCopy: DriveAuthorizationStatusCopy;
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

export const DriveSessionMenuPanel = ({
  authState,
  canClearAuthorization,
  canStartAuthorization,
  isBusy,
  onClearAuthorization,
  onStartAuthorization,
  requestReady,
  statusCopy,
}: DriveSessionMenuPanelProps) => {
  const triggerCopy = getDriveSessionTriggerCopy(statusCopy);
  const sessionDetails = getDriveSessionDetails(authState, requestReady);

  return (
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
        <OutlinedActionButton
          disabled={!canStartAuthorization}
          isBusy={isBusy}
          label={statusCopy.actionLabel}
          onPress={onStartAuthorization}
          variant="accent"
        />

        {canClearAuthorization ? (
          <OutlinedActionButton
            label="Forget session"
            onPress={onClearAuthorization}
            variant="neutral"
          />
        ) : null}
      </View>
    </View>
  );
};

// An account card anchored under the header's account button: radius 8, the
// raised edge-plus-darkness elevation, and outlined actions (design Decision 8).
const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: appTheme.space.touchTarget + appTheme.space.xs,
    right: 0,
    width: 286,
    gap: appTheme.space.lg,
    padding: 16,
    borderRadius: appTheme.radius.md,
    backgroundColor: appTheme.colors.surface,
    ...appTheme.elevation.raised,
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
    color: appTheme.colors.text,
    fontSize: 17,
    fontWeight: appTheme.fontWeight.medium,
    lineHeight: 22,
  },
  panelBody: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: appTheme.radius.pill,
  },
  statusBadgeNeutral: {
    backgroundColor: appTheme.colors.bg,
  },
  statusBadgeReady: {
    backgroundColor: appTheme.colors.successFill,
  },
  statusBadgeWarning: {
    backgroundColor: appTheme.colors.warningFill,
  },
  statusBadgeError: {
    backgroundColor: appTheme.colors.dangerFill,
  },
  statusBadgeLabel: {
    ...appTheme.type.kicker,
    fontWeight: appTheme.fontWeight.medium,
  },
  statusBadgeLabelNeutral: {
    color: appTheme.colors.text,
  },
  statusBadgeLabelReady: {
    color: appTheme.colors.success,
  },
  statusBadgeLabelWarning: {
    color: appTheme.colors.warning,
  },
  statusBadgeLabelError: {
    color: appTheme.colors.danger,
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
    ...appTheme.type.kicker,
    color: appTheme.colors.textMuted,
  },
  detailValue: {
    color: appTheme.colors.text,
    fontSize: 13,
    fontWeight: appTheme.fontWeight.medium,
    flexShrink: 1,
    textAlign: 'right',
  },
  actions: {
    gap: appTheme.space.sm,
  },
});
