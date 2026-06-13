import { renamePlaylist, type Playlist } from '@org/audio-library-models';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { getSelectedPlaylistIssue } from '../../playlists/utils/saved-playlist-status-view-model';
import {
  getSavedPlaylistRemovalCopy,
  resolveSelectedPlaylist,
  validatePlaylistName,
  type PlaylistDraftIssue,
  type SavedPlaylistIssue,
} from '../../playlists/utils/saved-playlist-view-model';

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

  useEffect(() => {
    if (savedPlaylists.length === 0) {
      setSelectedPlaylistIdState(null);
      setIsPlaylistDetailVisible(false);
      return;
    }

    const hasSelectedPlaylist = savedPlaylists.some((playlist) => {
      return playlist.id === selectedPlaylistId;
    });

    if (!hasSelectedPlaylist) {
      setSelectedPlaylistIdState(savedPlaylists[0]?.id ?? null);
    }
  }, [savedPlaylists, selectedPlaylistId]);

  const selectedPlaylist = resolveSelectedPlaylist(
    savedPlaylists,
    selectedPlaylistId,
  );

  useEffect(() => {
    if (!selectedPlaylist) {
      setIsPlaylistDetailVisible(false);
    }
  }, [selectedPlaylist]);

  return {
    cardRenamePlaylistId,
    cardRenamePlaylistName,
    closeCardRenameDialog() {
      setCardRenameIssue(null);
      setCardRenamePlaylistId(null);
      setCardRenamePlaylistNameState('');
    },
    closePlaylistDetail() {
      setIsPlaylistDetailVisible(false);
    },
    handleDeletePlaylist(playlistId: string) {
      const playlist = savedPlaylists.find((currentPlaylist) => {
        return currentPlaylist.id === playlistId;
      });

      if (!playlist) {
        return;
      }

      const removalCopy = getSavedPlaylistRemovalCopy(playlist);

      Alert.alert(removalCopy.title, removalCopy.message, [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: removalCopy.confirmLabel,
          style: 'destructive',
          onPress: () => {
            void deletePlaylist(playlist);
          },
        },
      ]);
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
    openPlaylistDetail(playlistId: string) {
      setSelectedPlaylistIdState(playlistId);
      setIsPlaylistDetailVisible(true);
    },
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
