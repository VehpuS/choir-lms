import { useEffect, useState } from 'react';

import type { PlaylistDraftIssue } from '../../../library/playlists/utils/saved-playlist-view-model';

type UseMobileShellQueuePlaylistStateOptions = {
  canShowQueuePlaylistActions: boolean;
  hasMiniPlayerSummary: boolean;
  onSaveQueueAsPlaylist: (name: string) => Promise<PlaylistDraftIssue | null>;
};

const createQueuePlaylistState = () => {
  return {
    isSaveDialogVisible: false,
    issue: null as PlaylistDraftIssue | null,
    queuePlaylistDraftName: '',
  };
};

export const useMobileShellQueuePlaylistState = ({
  canShowQueuePlaylistActions,
  hasMiniPlayerSummary,
  onSaveQueueAsPlaylist,
}: UseMobileShellQueuePlaylistStateOptions) => {
  const [queuePlaylistState, setQueuePlaylistState] = useState(
    createQueuePlaylistState,
  );

  const resetQueuePlaylistState = () => {
    setQueuePlaylistState(createQueuePlaylistState());
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
      setQueuePlaylistState((currentValue) => {
        return {
          ...currentValue,
          isSaveDialogVisible: false,
          issue: null,
        };
      });
    },
    onDraftNameChange(value: string) {
      setQueuePlaylistState((currentValue) => {
        return {
          ...currentValue,
          issue: null,
          queuePlaylistDraftName: value,
        };
      });
    },
    openAppendDialog() {
      setQueuePlaylistState((currentValue) => {
        return {
          ...currentValue,
          isAppendDialogVisible: true,
          isSaveDialogVisible: false,
          issue: null,
        };
      });
    },
    openSaveDialog() {
      setQueuePlaylistState((currentValue) => {
        return {
          ...currentValue,
          isSaveDialogVisible: true,
          issue: null,
        };
      });
    },
    async submitSave() {
      const issue = await onSaveQueueAsPlaylist(
        queuePlaylistState.queuePlaylistDraftName,
      );

      if (issue) {
        setQueuePlaylistState((currentValue) => {
          return {
            ...currentValue,
            issue,
          };
        });
        return;
      }

      resetQueuePlaylistState();
    },
  };
};
