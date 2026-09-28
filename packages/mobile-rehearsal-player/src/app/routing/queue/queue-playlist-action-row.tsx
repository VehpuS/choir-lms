import { View } from 'react-native';

import { OutlinedActionButton } from '../../components/outlined-action-button';
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
  const { updateAction } = actions;

  return (
    <View style={styles.queuePlaylistActionRow}>
      <OutlinedActionButton
        disabled={isMutating}
        fill
        label={isMutating ? 'Saving queue…' : actions.saveLabel}
        onPress={onSaveQueueAsPlaylist}
        // Saving is the primary action only when there is no playlist to update.
        variant={updateAction ? 'neutral' : 'accent'}
      />
      {updateAction ? (
        <OutlinedActionButton
          disabled={isMutating}
          fill
          label={updateAction.label}
          onPress={() => {
            onRequestUpdateQueuePlaylist(updateAction);
          }}
          variant="accent"
        />
      ) : null}
    </View>
  );
};
