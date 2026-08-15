import {
  addLoopToPlaylist,
  addTrackToPlaylist,
  renamePlaylist,
  type NamedLoop,
  type Playlist,
} from '@org/audio-library-models';
import { useEffect, useState } from 'react';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { getSelectedPlaylistIssue } from '../../playlists/utils/saved-playlist-status-view-model';
import {
  getSavedPlaylistRemovalCopy,
  resolveSelectedPlaylist,
  validatePlaylistName,
  type PlaylistDraftIssue,
  type SavedPlaylistIssue,
} from '../../playlists/utils/saved-playlist-view-model';
import {
  buildPlaylistDetailOrigin,
  type PlaylistDetailOpenContext,
} from './playlist-detail-origin';
import { useLibraryFilesConfirmationFlow } from './use-library-files-confirmation-flow';

type UseSavedRehearsalLibraryPlaylistStateOptions = {
  deletePlaylist: (playlist: Playlist) => Promise<boolean>;
  playlistIssue: SavedPlaylistIssue | null;
  savedPlaylists: Playlist[];
  updatePlaylist: (playlist: Playlist) => Promise<Playlist | null>;
};

export const useSavedRehearsalLibraryPlaylistState = ({
  deletePlaylist,
  playlistIssue,
  savedPlaylists,
  updatePlaylist,
}: UseSavedRehearsalLibraryPlaylistStateOptions) => {
  const [selectedPlaylistId, setSelectedPlaylistIdState] = useState<
    string | null
  >(null);
  const [isPlaylistDetailVisible, setIsPlaylistDetailVisible] = useState(false);
  const [cardRenameIssue, setCardRenameIssue] =
    useState<PlaylistDraftIssue | null>(null);
  const [cardRenamePlaylistId, setCardRenamePlaylistId] = useState<
    string | null
  >(null);
  const [cardRenamePlaylistName, setCardRenamePlaylistNameState] = useState('');
  const [filesAddItemsPlaylistId, setFilesAddItemsPlaylistId] = useState<
    string | null
  >(null);
  const [playlistDetailOrigin, setPlaylistDetailOrigin] =
    useState<ReturnType<typeof buildPlaylistDetailOrigin>>(null);
  const confirmationFlow = useLibraryFilesConfirmationFlow();

  useEffect(() => {
    if (savedPlaylists.length === 0) {
      setSelectedPlaylistIdState(null);
      setIsPlaylistDetailVisible(false);
      setPlaylistDetailOrigin(null);
      return;
    }

    const hasSelectedPlaylist = savedPlaylists.some((playlist) => {
      return playlist.id === selectedPlaylistId;
    });

    if (!hasSelectedPlaylist) {
      setSelectedPlaylistIdState(savedPlaylists[0]?.id ?? null);
    }

    if (
      filesAddItemsPlaylistId &&
      !savedPlaylists.some(
        (playlist) => playlist.id === filesAddItemsPlaylistId,
      )
    ) {
      setFilesAddItemsPlaylistId(null);
    }
  }, [filesAddItemsPlaylistId, savedPlaylists, selectedPlaylistId]);

  const selectedPlaylist = resolveSelectedPlaylist(
    savedPlaylists,
    selectedPlaylistId,
  );

  useEffect(() => {
    if (!selectedPlaylist) {
      setIsPlaylistDetailVisible(false);
      setFilesAddItemsPlaylistId(null);
      setPlaylistDetailOrigin(null);
    }
  }, [selectedPlaylist]);

  const persistSelectedPlaylist = async (
    buildNextPlaylist: (playlist: Playlist) => Playlist,
  ) => {
    if (!selectedPlaylist) {
      return null;
    }

    const persistedPlaylist = await updatePlaylist(
      buildNextPlaylist(selectedPlaylist),
    );

    if (persistedPlaylist) {
      setSelectedPlaylistIdState(persistedPlaylist.id);
    }

    return persistedPlaylist;
  };

  return {
    async addLoopToSelectedPlaylist(loop: NamedLoop) {
      return persistSelectedPlaylist((playlist) => {
        return addLoopToPlaylist(playlist, loop);
      });
    },
    async addSourceToSelectedPlaylist(source: DriveLibrarySource) {
      return persistSelectedPlaylist((playlist) => {
        return addTrackToPlaylist(playlist, source);
      });
    },
    cardRenamePlaylistId,
    cardRenamePlaylistName,
    closeCardRenameDialog() {
      setCardRenameIssue(null);
      setCardRenamePlaylistId(null);
      setCardRenamePlaylistNameState('');
    },
    closeFilesAddItems() {
      setFilesAddItemsPlaylistId(null);
    },
    closePlaylistDetail() {
      setIsPlaylistDetailVisible(false);
      setPlaylistDetailOrigin(null);
    },
    confirmationDialog: confirmationFlow.confirmationDialog,
    handleDeletePlaylist(playlistId: string) {
      const playlist = savedPlaylists.find((currentPlaylist) => {
        return currentPlaylist.id === playlistId;
      });

      if (!playlist) {
        return;
      }

      const removalCopy = getSavedPlaylistRemovalCopy(playlist);

      confirmationFlow.requestConfirmation({
        content: removalCopy,
        onConfirm: async () => {
          await deletePlaylist(playlist);
        },
      });
    },
    async handleRenamePlaylistCard() {
      if (!cardRenamePlaylistId) {
        return;
      }

      const playlist = savedPlaylists.find((currentPlaylist) => {
        return currentPlaylist.id === cardRenamePlaylistId;
      });

      if (!playlist) {
        setCardRenameIssue(null);
        setCardRenamePlaylistId(null);
        setCardRenamePlaylistNameState('');
        return;
      }

      const nextRenameIssue = validatePlaylistName(cardRenamePlaylistName);

      if (nextRenameIssue) {
        setCardRenameIssue(nextRenameIssue);
        return;
      }

      setCardRenameIssue(null);

      const persistedPlaylist = await updatePlaylist(
        renamePlaylist(playlist, cardRenamePlaylistName),
      );

      if (!persistedPlaylist) {
        return;
      }

      setCardRenamePlaylistId(null);
      setCardRenamePlaylistNameState('');
    },
    isFilesAddItemsVisible:
      selectedPlaylist !== null &&
      filesAddItemsPlaylistId === selectedPlaylist.id,
    isPlaylistDetailVisible,
    openCardRenameDialog(playlistId: string) {
      const playlist = savedPlaylists.find((currentPlaylist) => {
        return currentPlaylist.id === playlistId;
      });

      if (!playlist) {
        return;
      }

      setCardRenameIssue(null);
      setCardRenamePlaylistId(playlist.id);
      setCardRenamePlaylistNameState(playlist.name);
    },
    openPlaylistDetail(
      playlistId: string,
      openContext?: PlaylistDetailOpenContext,
    ) {
      setFilesAddItemsPlaylistId(null);
      setSelectedPlaylistIdState(playlistId);
      setPlaylistDetailOrigin(buildPlaylistDetailOrigin(openContext));
      setIsPlaylistDetailVisible(true);
    },
    openFilesAddItems(playlistId?: string) {
      if (playlistId) {
        const playlist = savedPlaylists.find((currentPlaylist) => {
          return currentPlaylist.id === playlistId;
        });

        if (!playlist) {
          return;
        }

        setSelectedPlaylistIdState(playlist.id);
        setFilesAddItemsPlaylistId(playlist.id);
        return;
      }

      if (!selectedPlaylist) {
        return;
      }

      setFilesAddItemsPlaylistId(selectedPlaylist.id);
    },
    playlistDetailOrigin,
    selectedCardRenameIssue:
      cardRenameIssue ??
      getSelectedPlaylistIssue(playlistIssue, cardRenamePlaylistId),
    selectedPlaylist,
    selectedPlaylistId,
    setCardRenamePlaylistName(value: string) {
      setCardRenamePlaylistNameState(value);
      setCardRenameIssue(null);
    },
    setSelectedPlaylistId(playlistId: string) {
      setSelectedPlaylistIdState(playlistId);
    },
  };
};
