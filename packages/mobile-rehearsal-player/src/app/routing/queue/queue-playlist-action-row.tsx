import { Pressable, Text, View } from 'react-native';

import type { UpNextSurfaceSummary } from '../shell/shell-model';
import { styles } from '../playback/playback-surface-styles';

type QueuePlaylistActionRowProps = {
  actions: NonNullable<UpNextSurfaceSummary['queuePlaylistActions']>;
  isMutating: boolean;
  onAppendQueueToPlaylist: () => void;
  onSaveQueueAsPlaylist: () => void;
};

export const QueuePlaylistActionRow = ({
  actions,
  isMutating,
  onAppendQueueToPlaylist,
  onSaveQueueAsPlaylist,
}: QueuePlaylistActionRowProps) => {
  return (
    <View style={styles.queuePlaylistActionRow}>
      <Pressable
        accessibilityRole="button"
        disabled={isMutating}
        onPress={onSaveQueueAsPlaylist}
        style={({ pressed }) => [
          styles.queuePlaylistSecondaryAction,
          pressed && !isMutating ? styles.headerActionPressed : null,
          isMutating ? styles.headerActionDisabled : null,
        ]}
      >
        <Text style={styles.queuePlaylistSecondaryActionLabel}>
          {isMutating ? 'Saving queue…' : actions.saveLabel}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={isMutating}
        onPress={onAppendQueueToPlaylist}
        style={({ pressed }) => [
          styles.queuePlaylistPrimaryAction,
          pressed && !isMutating ? styles.headerActionPressed : null,
          isMutating ? styles.headerActionDisabled : null,
        ]}
      >
        <Text style={styles.queuePlaylistPrimaryActionLabel}>
          {actions.updateLabel}
        </Text>
      </Pressable>
    </View>
  );
};
