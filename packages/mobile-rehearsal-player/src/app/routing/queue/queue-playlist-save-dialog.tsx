import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../components/interaction-guard';
import { CenteredDialogCard } from '../../library/components/centered-dialog-card';
import { FeedbackCard } from '../../library/components/feedback-card';
import {
  SAVED_PLAYLIST_PLACEHOLDER_TEXT,
  savedPlaylistSectionStyles as playlistStyles,
} from '../../library/components/saved-playlist-section-styles';
import type { PlaylistDraftIssue } from '../../library/playlists/utils/saved-playlist-view-model';
import { appTheme } from '../../utils/theme';

type QueuePlaylistSaveDialogProps = {
  isMutating: boolean;
  isVisible: boolean;
  issue: PlaylistDraftIssue | null;
  value: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export const QueuePlaylistSaveDialog = ({
  isMutating,
  isVisible,
  issue,
  value,
  onCancel,
  onChange,
  onSubmit,
}: QueuePlaylistSaveDialogProps) => {
  return (
    <CenteredDialogCard isVisible={isVisible} onRequestClose={onCancel}>
      <Text style={styles.title}>Create new playlist</Text>
      <Text style={styles.body}>
        Create a new playlist from the current Up Next order. Unsaved queued
        tracks will be added to Library first.
      </Text>
      <TextInput
        autoCapitalize="words"
        autoCorrect={false}
        autoFocus
        onChangeText={onChange}
        placeholder="Wednesday rehearsal"
        placeholderTextColor={SAVED_PLAYLIST_PLACEHOLDER_TEXT}
        returnKeyType="done"
        style={styles.nameInput}
        value={value}
      />
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
          {...interactionGuardProps}
          disabled={isMutating}
          onPress={onCancel}
          style={({ pressed }) => [
            playlistStyles.secondaryButton,
            buttonInteractionGuardStyle,
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
          {...interactionGuardProps}
          disabled={isMutating}
          onPress={onSubmit}
          style={({ pressed }) => [
            playlistStyles.primaryButton,
            buttonInteractionGuardStyle,
            pressed && !isMutating
              ? playlistStyles.actionButtonPressed
              : undefined,
            isMutating ? playlistStyles.actionButtonDisabled : undefined,
          ]}
        >
          <Text style={playlistStyles.primaryButtonLabel}>
            {isMutating ? 'Creating…' : 'Create playlist'}
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
  nameInput: {
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: appTheme.colors.primaryText,
    backgroundColor: appTheme.colors.surfaceBackground,
  },
  title: {
    color: appTheme.colors.primaryText,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
});
