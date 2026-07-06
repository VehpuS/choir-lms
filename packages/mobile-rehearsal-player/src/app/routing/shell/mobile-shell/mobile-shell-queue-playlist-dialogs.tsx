import type { PlaylistDraftIssue } from '../../../library/playlists/utils/saved-playlist-view-model';
import { QueuePlaylistSaveDialog } from '../../queue/queue-playlist-save-dialog';
import { QueuePlaylistUpdateDialog } from '../../queue/queue-playlist-update-dialog';
import type { QueuePlaylistUpdateAction } from './queue-playlist-dialog-state';

type MobileShellQueuePlaylistDialogsProps = {
  isMutating: boolean;
  isSaveDialogVisible: boolean;
  isUpdateDialogVisible: boolean;
  issue: PlaylistDraftIssue | null;
  onCancelSave: () => void;
  onCancelUpdate: () => void;
  onChangeDraftName: (value: string) => void;
  onSubmitSave: () => void;
  onSubmitUpdate: () => void;
  queuePlaylistDraftName: string;
  updateAction: QueuePlaylistUpdateAction | null;
};

export const MobileShellQueuePlaylistDialogs = ({
  isMutating,
  isSaveDialogVisible,
  isUpdateDialogVisible,
  issue,
  onCancelSave,
  onCancelUpdate,
  onChangeDraftName,
  onSubmitSave,
  onSubmitUpdate,
  queuePlaylistDraftName,
  updateAction,
}: MobileShellQueuePlaylistDialogsProps) => {
  return (
    <>
      <QueuePlaylistSaveDialog
        isMutating={isMutating}
        isVisible={isSaveDialogVisible}
        issue={issue}
        onCancel={onCancelSave}
        onChange={onChangeDraftName}
        onSubmit={onSubmitSave}
        value={queuePlaylistDraftName}
      />
      <QueuePlaylistUpdateDialog
        action={updateAction}
        isMutating={isMutating}
        isVisible={isUpdateDialogVisible}
        issue={issue}
        onCancel={onCancelUpdate}
        onSubmit={onSubmitUpdate}
      />
    </>
  );
};
