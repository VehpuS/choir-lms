import type { Playlist } from '@org/audio-library-models';

import { QueuePlaylistAppendDialog } from '../../queue/queue-playlist-append-dialog';
import { QueuePlaylistSaveDialog } from '../../queue/queue-playlist-save-dialog';
import type { PlaylistDraftIssue } from '../../../library/playlists/utils/saved-playlist-view-model';

type MobileShellQueuePlaylistDialogsProps = {
  isAppendDialogVisible: boolean;
  isMutating: boolean;
  isSaveDialogVisible: boolean;
  issue: PlaylistDraftIssue | null;
  onCancelAppend: () => void;
  onCancelSave: () => void;
  onChangeDraftName: (value: string) => void;
  onSelectPlaylist: (playlistId: string) => void;
  onSubmitSave: () => void;
  playlists: Playlist[];
  queuePlaylistDraftName: string;
};

export const MobileShellQueuePlaylistDialogs = ({
  isAppendDialogVisible,
  isMutating,
  isSaveDialogVisible,
  issue,
  onCancelAppend,
  onCancelSave,
  onChangeDraftName,
  onSelectPlaylist,
  onSubmitSave,
  playlists,
  queuePlaylistDraftName,
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

      <QueuePlaylistAppendDialog
        isMutating={isMutating}
        isVisible={isAppendDialogVisible}
        issue={issue}
        onCancel={onCancelAppend}
        onSelectPlaylist={onSelectPlaylist}
        playlists={playlists}
      />
    </>
  );
};