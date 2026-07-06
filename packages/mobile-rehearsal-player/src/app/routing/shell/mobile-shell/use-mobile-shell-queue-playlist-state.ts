import { useEffect, useState } from 'react';

import type { PlaylistDraftIssue } from '../../../library/playlists/utils/saved-playlist-view-model';
import {
  closeQueuePlaylistSaveDialog,
  closeQueuePlaylistUpdateDialog,
  createQueuePlaylistDialogState,
  openQueuePlaylistSaveDialog,
  openQueuePlaylistUpdateDialog,
  setQueuePlaylistDialogIssue,
  setQueuePlaylistDraftName,
  type QueuePlaylistUpdateAction,
} from './queue-playlist-dialog-state';

type UseMobileShellQueuePlaylistStateOptions = {
  canShowQueuePlaylistActions: boolean;
  hasMiniPlayerSummary: boolean;
  onSaveQueueAsPlaylist: (name: string) => Promise<PlaylistDraftIssue | null>;
  onUpdateQueuePlaylist: () => Promise<PlaylistDraftIssue | null>;
};

export const useMobileShellQueuePlaylistState = ({
  canShowQueuePlaylistActions,
  hasMiniPlayerSummary,
  onSaveQueueAsPlaylist,
  onUpdateQueuePlaylist,
}: UseMobileShellQueuePlaylistStateOptions) => {
  const [queuePlaylistState, setQueuePlaylistState] = useState(
    createQueuePlaylistDialogState,
  );

  const resetQueuePlaylistState = () => {
    setQueuePlaylistState(createQueuePlaylistDialogState());
  };

  useEffect(() => {
    if (hasMiniPlayerSummary) {
      return;
    }

    resetQueuePlaylistState();
  }, [hasMiniPlayerSummary]);

  useEffect(() => {
    if (canShowQueuePlaylistActions) {
      return;
    }

    resetQueuePlaylistState();
  }, [canShowQueuePlaylistActions]);

  return {
    ...queuePlaylistState,
    closeQueueDialogs() {
      resetQueuePlaylistState();
    },
    closeSaveDialog() {
      setQueuePlaylistState(closeQueuePlaylistSaveDialog);
    },
    closeUpdateDialog() {
      setQueuePlaylistState(closeQueuePlaylistUpdateDialog);
    },
    onDraftNameChange(value: string) {
      setQueuePlaylistState((currentValue) => {
        return setQueuePlaylistDraftName(currentValue, value);
      });
    },
    openSaveDialog() {
      setQueuePlaylistState((currentValue) => {
        return openQueuePlaylistSaveDialog(currentValue);
      });
    },
    openUpdateDialog(updateAction: QueuePlaylistUpdateAction) {
      setQueuePlaylistState((currentValue) => {
        return openQueuePlaylistUpdateDialog(currentValue, updateAction);
      });
    },
    async submitSave() {
      const issue = await onSaveQueueAsPlaylist(
        queuePlaylistState.queuePlaylistDraftName,
      );

      if (issue) {
        setQueuePlaylistState((currentValue) => {
          return setQueuePlaylistDialogIssue(currentValue, issue);
        });
        return;
      }

      resetQueuePlaylistState();
    },
    async submitUpdate() {
      const issue = await onUpdateQueuePlaylist();

      if (issue) {
        setQueuePlaylistState((currentValue) => {
          return setQueuePlaylistDialogIssue(currentValue, issue);
        });
        return;
      }

      resetQueuePlaylistState();
    },
  };
};
