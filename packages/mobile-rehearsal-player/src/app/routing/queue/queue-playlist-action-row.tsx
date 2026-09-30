import { View } from 'react-native';

import { OutlinedActionButton } from '../../components/outlined-action-button';
import type { UpNextSurfaceSummary } from '../shell/shell-model';
import { queueStyles as styles } from './styles';

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

// The pinned footer (1h): update the playlist the queue came from, or save the
// queue as a new one.
export const QueuePlaylistActionRow = ({
  actions,
  isMutating,
  onSaveQueueAsPlaylist,
  onRequestUpdateQueuePlaylist,
}: QueuePlaylistActionRowProps) => {
  const { updateAction } = actions;

  return (
    <View style={styles.footer}>
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
      <OutlinedActionButton
        disabled={isMutating}
        fill
        label={isMutating ? 'Saving queue…' : actions.saveLabel}
        onPress={onSaveQueueAsPlaylist}
        // Saving is the primary action only when there is no playlist to update.
        variant={updateAction ? 'neutral' : 'accent'}
      />
    </View>
  );
};
