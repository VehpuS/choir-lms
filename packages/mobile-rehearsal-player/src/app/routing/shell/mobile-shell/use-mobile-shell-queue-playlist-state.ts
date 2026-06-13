import { useEffect, useState } from 'react';

import type { PlaylistDraftIssue } from '../../../library/playlists/utils/saved-playlist-view-model';

type UseMobileShellQueuePlaylistStateOptions = {
  canShowQueuePlaylistActions: boolean;
  hasMiniPlayerSummary: boolean;
  onAppendQueueToPlaylist: (
    playlistId: string,
  ) => Promise<PlaylistDraftIssue | null>;
  onSaveQueueAsPlaylist: (name: string) => Promise<PlaylistDraftIssue | null>;
};

const createQueuePlaylistState = () => {
  return {
    isAppendDialogVisible: false,
    isSaveDialogVisible: false,
    issue: null as PlaylistDraftIssue | null,
    queuePlaylistDraftName: '',
  };
};

export const useMobileShellQueuePlaylistState = ({
  canShowQueuePlaylistActions,
  hasMiniPlayerSummary,
  onAppendQueueToPlaylist,
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
    clearQueuePlaylistIssue() {
      setQueuePlaylistState((currentValue) => {
        return {
          ...currentValue,
          issue: null,
        };
      });
    },
    closeAppendDialog() {
      setQueuePlaylistState((currentValue) => {
        return {
          ...currentValue,
          isAppendDialogVisible: false,
          issue: null,
        };
      });
    },
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
          isAppendDialogVisible: false,
          isSaveDialogVisible: true,
          issue: null,
        };
      });
    },
    async selectPlaylist(playlistId: string) {
      const issue = await onAppendQueueToPlaylist(playlistId);

      if (issue) {
        setQueuePlaylistState((currentValue) => {
          return {
            ...currentValue,
            issue,
          };
        });
        return;
      }

      setQueuePlaylistState((currentValue) => {
        return {
          ...currentValue,
          isAppendDialogVisible: false,
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
