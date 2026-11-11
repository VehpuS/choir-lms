import { QueuePlaylistSaveDialog } from '../../queue/queue-playlist-save-dialog';
import { QueuePlaylistUpdateDialog } from '../../queue/queue-playlist-update-dialog';
import type { useMobileShellQueuePlaylistState } from './use-mobile-shell-queue-playlist-state';

type MobileShellQueuePlaylistDialogsProps = {
  isMutating: boolean;
  state: ReturnType<typeof useMobileShellQueuePlaylistState>;
};

export const MobileShellQueuePlaylistDialogs = ({
  isMutating,
  state,
}: MobileShellQueuePlaylistDialogsProps) => {
  return (
    <>
      <QueuePlaylistSaveDialog
        isMutating={isMutating}
        isVisible={state.isSaveDialogVisible}
        issue={state.issue}
        onCancel={state.closeSaveDialog}
        onChange={state.onDraftNameChange}
        onSubmit={() => {
          void (async () => {
            await state.submitSave();
          })();
        }}
        value={state.queuePlaylistDraftName}
      />
      <QueuePlaylistUpdateDialog
        action={state.updateAction}
        isMutating={isMutating}
        isVisible={state.isUpdateDialogVisible}
        issue={state.issue}
        onCancel={state.closeUpdateDialog}
        onSubmit={() => {
          void (async () => {
            await state.submitUpdate();
          })();
        }}
      />
    </>
  );
};
