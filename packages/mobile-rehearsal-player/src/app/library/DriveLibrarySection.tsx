import type { DriveAuthorizationState } from '@org/google-drive';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getDriveLibraryStatusCopy,
  type DriveLibraryStatusTone,
} from './drive-library-view-model';
import { DriveLibrarySourceGroup } from './DriveLibrarySourceGroup';
import { useDriveLibrary } from './use-drive-library';

type DriveLibrarySectionProps = {
  authState: DriveAuthorizationState;
  googleAuthConfigured: boolean;
};

const BORDER_COLOR = '#d6d1c4';
const CARD_BACKGROUND = '#fffdf8';
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

export const DriveLibrarySection = ({
  authState,
  googleAuthConfigured,
}: DriveLibrarySectionProps) => {
  const { isLoading, issue, playableSources, refresh, unavailableSources } =
    useDriveLibrary(authState);
  const statusCopy = getDriveLibraryStatusCopy({
    authState,
    googleAuthConfigured,
    isLoading,
    issue,
    snapshot: {
      playableSources,
      unavailableSources,
    },
  });
  const canRefresh = authState.status === 'authorized';

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionCopy}>
          <Text style={styles.eyebrow}>Rehearsal library</Text>
          <Text style={styles.sectionTitle}>
            Google Drive audio, filtered for practice
          </Text>
          <Text style={styles.sectionBody}>
            Supported sources stay visible as full-track rehearsal material,
            while unsupported or unavailable items remain in view with explicit
            status details.
          </Text>
        </View>
        {canRefresh ? (
          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            onPress={refresh}
            style={({ pressed }) => [
              styles.refreshButton,
              pressed ? styles.refreshButtonPressed : undefined,
              isLoading ? styles.refreshButtonDisabled : undefined,
            ]}
          >
            <Text style={styles.refreshButtonLabel}>
              {isLoading ? 'Refreshing' : 'Refresh'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.statusCard, getToneSurfaceStyle(statusCopy.tone)]}>
        <Text style={[styles.statusTitle, getToneTitleStyle(statusCopy.tone)]}>
          {statusCopy.title}
        </Text>
        <Text style={styles.statusMessage}>{statusCopy.message}</Text>
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={SECONDARY_TEXT} size="small" />
            <Text style={styles.loadingLabel}>Refreshing Google Drive…</Text>
          </View>
        ) : null}
      </View>

      <DriveLibrarySourceGroup
        sources={playableSources}
        title={`Playable sources (${playableSources.length})`}
      />

      <DriveLibrarySourceGroup
        sources={unavailableSources}
        title={`Unavailable or unsupported (${unavailableSources.length})`}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 20,
    backgroundColor: CARD_BACKGROUND,
  },
  sectionHeader: {
    gap: 16,
  },
  sectionCopy: {
    gap: 8,
  },
  eyebrow: {
    color: SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: PRIMARY_TEXT,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  sectionBody: {
    color: SECONDARY_TEXT,
    fontSize: 15,
    lineHeight: 22,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#173229',
  },
  refreshButtonPressed: {
    opacity: 0.88,
  },
  refreshButtonDisabled: {
    opacity: 0.56,
  },
  refreshButtonLabel: {
    color: '#fff8ef',
    fontSize: 14,
    fontWeight: '600',
  },
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
