import { Pressable, Text, View } from 'react-native';

import { styles } from '../playback/playback-surface-styles';
import type { UpNextSurfaceSummary } from '../shell/shell-model';

type QueuePlaylistActionRowProps = {
  actions: NonNullable<UpNextSurfaceSummary['queuePlaylistActions']>;
  isMutating: boolean;
  onSaveQueueAsPlaylist: () => void;
  onRequestUpdateQueuePlaylist: (
    action: NonNullable<
      NonNullable<UpNextSurfaceSummary['queuePlaylistActions']>['updateAction']
    >,
  ) => void;
};

export const QueuePlaylistActionRow = ({
  actions,
  isMutating,
  onSaveQueueAsPlaylist,
  onRequestUpdateQueuePlaylist,
}: QueuePlaylistActionRowProps) => {
  const hasUpdateAction = actions.updateAction !== null;

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
          onPress={() => {
            if (!actions.updateAction) {
              return;
            }

            onRequestUpdateQueuePlaylist(actions.updateAction);
          }}
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
