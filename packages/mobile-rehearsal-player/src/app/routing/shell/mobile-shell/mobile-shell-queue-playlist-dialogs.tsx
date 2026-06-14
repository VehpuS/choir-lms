import { QueuePlaylistSaveDialog } from '../../queue/queue-playlist-save-dialog';
import type { PlaylistDraftIssue } from '../../../library/playlists/utils/saved-playlist-view-model';

type MobileShellQueuePlaylistDialogsProps = {
  isMutating: boolean;
  isSaveDialogVisible: boolean;
  issue: PlaylistDraftIssue | null;
  onCancelSave: () => void;
  onChangeDraftName: (value: string) => void;
  onSubmitSave: () => void;
  queuePlaylistDraftName: string;
};

export const MobileShellQueuePlaylistDialogs = ({
  isMutating,
  isSaveDialogVisible,
  issue,
  onCancelSave,
  onChangeDraftName,
  onSubmitSave,
  queuePlaylistDraftName,
}: MobileShellQueuePlaylistDialogsProps) => {
  return (
    <QueuePlaylistSaveDialog
      isMutating={isMutating}
      isVisible={isSaveDialogVisible}
      issue={issue}
      onCancel={onCancelSave}
      onChange={onChangeDraftName}
      onSubmit={onSubmitSave}
      value={queuePlaylistDraftName}
    />
  );
};
