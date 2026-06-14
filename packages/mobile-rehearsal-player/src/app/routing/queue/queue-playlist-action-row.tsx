import { Alert, Pressable, Text, View } from 'react-native';

import type { PlaylistDraftIssue } from '../../library/playlists/utils/saved-playlist-view-model';
import { styles } from '../playback/playback-surface-styles';
import type { UpNextSurfaceSummary } from '../shell/shell-model';

type QueuePlaylistActionRowProps = {
  actions: NonNullable<UpNextSurfaceSummary['queuePlaylistActions']>;
  isMutating: boolean;
  onUpdateQueuePlaylist: () => Promise<PlaylistDraftIssue | null>;
  onSaveQueueAsPlaylist: () => void;
};

export const QueuePlaylistActionRow = ({
  actions,
  isMutating,
  onUpdateQueuePlaylist,
  onSaveQueueAsPlaylist,
}: QueuePlaylistActionRowProps) => {
  const hasUpdateAction = actions.updateAction !== null;

  const handleConfirmUpdate = () => {
    if (!actions.updateAction) {
      return;
    }

    Alert.alert(
      actions.updateAction.confirmationTitle,
      actions.updateAction.confirmationMessage,
      [
        {
          style: 'cancel',
          text: 'Cancel',
        },
        {
          text: actions.updateAction.confirmLabel,
          onPress: () => {
            void (async () => {
              const issue = await onUpdateQueuePlaylist();

              if (issue) {
                Alert.alert(issue.title, issue.message);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.queuePlaylistActionRow}>
      <Pressable
        accessibilityRole="button"
        disabled={isMutating}
        onPress={onSaveQueueAsPlaylist}
        style={({ pressed }) => [
          hasUpdateAction
            ? styles.queuePlaylistSecondaryAction
            : styles.queuePlaylistPrimaryAction,
          pressed && !isMutating ? styles.headerActionPressed : null,
          isMutating ? styles.headerActionDisabled : null,
        ]}
      >
        <Text
          style={
            hasUpdateAction
              ? styles.queuePlaylistSecondaryActionLabel
              : styles.queuePlaylistPrimaryActionLabel
          }
        >
          {isMutating ? 'Saving queue…' : actions.saveLabel}
        </Text>
      </Pressable>
      {actions.updateAction ? (
        <Pressable
          accessibilityRole="button"
          disabled={isMutating}
          onPress={handleConfirmUpdate}
          style={({ pressed }) => [
            styles.queuePlaylistPrimaryAction,
            pressed && !isMutating ? styles.headerActionPressed : null,
            isMutating ? styles.headerActionDisabled : null,
          ]}
        >
          <Text style={styles.queuePlaylistPrimaryActionLabel}>
            {actions.updateAction.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};
