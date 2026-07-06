import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CenteredDialogCard } from '../../library/components/centered-dialog-card';
import { FeedbackCard } from '../../library/components/feedback-card';
import { savedPlaylistSectionStyles as playlistStyles } from '../../library/components/saved-playlist-section-styles';
import type { PlaylistDraftIssue } from '../../library/playlists/utils/saved-playlist-view-model';
import { appTheme } from '../../utils/theme';
import type { UpNextSurfaceSummary } from '../shell/shell-model';

type QueuePlaylistUpdateDialogProps = {
  action: NonNullable<
    NonNullable<UpNextSurfaceSummary['queuePlaylistActions']>['updateAction']
  > | null;
  isMutating: boolean;
  isVisible: boolean;
  issue: PlaylistDraftIssue | null;
  onCancel: () => void;
  onSubmit: () => void;
};

export const QueuePlaylistUpdateDialog = ({
  action,
  isMutating,
  isVisible,
  issue,
  onCancel,
  onSubmit,
}: QueuePlaylistUpdateDialogProps) => {
  if (!isVisible || !action) {
    return null;
  }

  return (
    <CenteredDialogCard isVisible={isVisible} onRequestClose={onCancel}>
      <Text style={styles.title}>{action.confirmationTitle}</Text>
      <Text style={styles.body}>{action.confirmationMessage}</Text>
      {issue ? (
        <FeedbackCard
          message={issue.message}
          size="compact"
          title={issue.title}
          tone="error"
        />
      ) : null}
      <View style={playlistStyles.actionRow}>
        <Pressable
          accessibilityRole="button"
          disabled={isMutating}
          onPress={onCancel}
          style={({ pressed }) => [
            playlistStyles.secondaryButton,
            pressed && !isMutating
              ? playlistStyles.actionButtonPressed
              : undefined,
            isMutating ? playlistStyles.actionButtonDisabled : undefined,
          ]}
        >
          <Text style={playlistStyles.secondaryButtonLabel}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isMutating}
          onPress={onSubmit}
          style={({ pressed }) => [
            playlistStyles.primaryButton,
            pressed && !isMutating
              ? playlistStyles.actionButtonPressed
              : undefined,
            isMutating ? playlistStyles.actionButtonDisabled : undefined,
          ]}
        >
          <Text style={playlistStyles.primaryButtonLabel}>
            {isMutating ? 'Updating…' : action.confirmLabel}
          </Text>
        </Pressable>
      </View>
    </CenteredDialogCard>
  );
};

const styles = StyleSheet.create({
  body: {
    color: appTheme.colors.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    color: appTheme.colors.primaryText,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
});
