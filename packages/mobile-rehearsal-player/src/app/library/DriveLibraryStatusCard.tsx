import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  type DriveLibraryStatusCopy,
  type DriveLibraryStatusTone,
} from './drive-library-view-model';

type DriveLibraryStatusCardProps = {
  isLoading: boolean;
  loadingLabel?: string;
  statusCopy: DriveLibraryStatusCopy;
};

const ERROR_SURFACE = '#fff1ed';
const ERROR_TEXT = '#8a2d1f';
const NEUTRAL_SURFACE = '#f6f1e7';
const PRIMARY_TEXT = '#1f1c17';
const READY_SURFACE = '#e7f2ec';
const READY_TEXT = '#1f5c40';
const SECONDARY_TEXT = '#5f5647';
const WARNING_SURFACE = '#fff4dd';
const WARNING_TEXT = '#7f5b12';

const getToneSurfaceStyle = (tone: DriveLibraryStatusTone) => {
  if (tone === 'ready') {
    return styles.statusReady;
  }

  if (tone === 'warning') {
    return styles.statusWarning;
  }

  if (tone === 'error') {
    return styles.statusError;
  }

  return styles.statusNeutral;
};

const getToneTitleStyle = (tone: DriveLibraryStatusTone) => {
  if (tone === 'ready') {
    return styles.statusReadyText;
  }

  if (tone === 'warning') {
    return styles.statusWarningText;
  }

  if (tone === 'error') {
    return styles.statusErrorText;
  }

  return styles.statusNeutralText;
};

export const DriveLibraryStatusCard = ({
  isLoading,
  loadingLabel = 'Refreshing Google Drive…',
  statusCopy,
}: DriveLibraryStatusCardProps) => {
  return (
    <View style={[styles.statusCard, getToneSurfaceStyle(statusCopy.tone)]}>
      <Text style={[styles.statusTitle, getToneTitleStyle(statusCopy.tone)]}>
        {statusCopy.title}
      </Text>
      <Text style={styles.statusMessage}>{statusCopy.message}</Text>
      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={SECONDARY_TEXT} size="small" />
          <Text style={styles.loadingLabel}>{loadingLabel}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  statusCard: {
    gap: 8,
    padding: 16,
    borderRadius: 16,
  },
  statusNeutral: {
    backgroundColor: NEUTRAL_SURFACE,
  },
  statusReady: {
    backgroundColor: READY_SURFACE,
  },
  statusWarning: {
    backgroundColor: WARNING_SURFACE,
  },
  statusError: {
    backgroundColor: ERROR_SURFACE,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusNeutralText: {
    color: PRIMARY_TEXT,
  },
  statusReadyText: {
    color: READY_TEXT,
  },
  statusWarningText: {
    color: WARNING_TEXT,
  },
  statusErrorText: {
    color: ERROR_TEXT,
  },
  statusMessage: {
    color: SECONDARY_TEXT,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  loadingLabel: {
    color: SECONDARY_TEXT,
    fontSize: 14,
  },
});
