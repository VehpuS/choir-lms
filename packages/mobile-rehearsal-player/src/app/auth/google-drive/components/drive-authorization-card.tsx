import type { DriveAuthorizationState } from '@org/google-drive';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { DriveAuthorizationStatusCopy } from '../authorization';

type DriveAuthorizationCardProps = {
  authState: DriveAuthorizationState;
  canClearAuthorization: boolean;
  canStartAuthorization: boolean;
  isBusy: boolean;
  onClearAuthorization: () => void;
  onStartAuthorization: () => void;
  requestReady: boolean;
  statusCopy: DriveAuthorizationStatusCopy;
};

type ActionButtonProps = {
  label: string;
  busy?: boolean;
  disabled?: boolean;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

const BORDER_COLOR = '#d6d1c4';
const PRIMARY_TEXT = '#1f1c17';
const SECONDARY_TEXT = '#5f5647';

const formatExpirationLabel = (expiresAt?: string) => {
  if (!expiresAt) {
    return 'Managed by the current Google token lifetime';
  }

  const parsedDate = new Date(expiresAt);

  if (Number.isNaN(parsedDate.valueOf())) {
    return 'Managed by the current Google token lifetime';
  }

  return parsedDate.toLocaleString();
};

const ActionButton = ({
  label,
  busy = false,
  disabled = false,
  onPress,
  variant = 'primary',
}: ActionButtonProps) => {
  const secondary = variant === 'secondary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.secondaryButton : styles.primaryButton,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? PRIMARY_TEXT : '#fff8ef'} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            secondary ? styles.secondaryButtonLabel : null,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
};

const getToneStyle = (tone: DriveAuthorizationStatusCopy['tone']) => {
  if (tone === 'ready') {
    return styles.readyCard;
  }

  if (tone === 'warning') {
    return styles.warningCard;
  }

  if (tone === 'error') {
    return styles.errorCard;
  }

  return styles.neutralCard;
};

export const DriveAuthorizationCard = ({
  authState,
  canClearAuthorization,
  canStartAuthorization,
  isBusy,
  onClearAuthorization,
  onStartAuthorization,
  requestReady,
  statusCopy,
}: DriveAuthorizationCardProps) => {
  return (
    <View style={[styles.card, getToneStyle(statusCopy.tone)]}>
      <Text style={styles.eyebrow}>Google Drive connection</Text>
      <Text style={styles.title}>{statusCopy.title}</Text>
      <Text style={styles.body}>{statusCopy.message}</Text>

      <View style={styles.metaList}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Drive scope</Text>
          <Text style={styles.metaValue}>{authState.scope}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Session expiry</Text>
          <Text style={styles.metaValue}>
            {formatExpirationLabel(authState.expiresAt)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Sign-in request</Text>
          <Text style={styles.metaValue}>
            {requestReady ? 'Prepared' : 'Preparing'}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <ActionButton
          busy={isBusy}
          disabled={!canStartAuthorization}
          label={statusCopy.actionLabel}
          onPress={onStartAuthorization}
        />

        <ActionButton
          disabled={!canClearAuthorization}
          label="Forget saved session"
          onPress={onClearAuthorization}
          variant="secondary"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 20,
  },
  neutralCard: {
    backgroundColor: '#fffdf8',
  },
  readyCard: {
    backgroundColor: '#edf7ef',
  },
  warningCard: {
    backgroundColor: '#fff6df',
  },
  errorCard: {
    backgroundColor: '#f8e6e0',
  },
  eyebrow: {
    color: SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: PRIMARY_TEXT,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  body: {
    color: SECONDARY_TEXT,
    fontSize: 15,
    lineHeight: 22,
  },
  metaList: {
    gap: 10,
    marginTop: 2,
  },
  metaRow: {
    gap: 4,
  },
  metaLabel: {
    color: SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metaValue: {
    color: PRIMARY_TEXT,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  primaryButton: {
    backgroundColor: '#173229',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    color: '#fff8ef',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonLabel: {
    color: PRIMARY_TEXT,
  },
});
