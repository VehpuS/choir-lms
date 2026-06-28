import { type Playlist } from '@org/audio-library-models';
import { useState } from 'react';

import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../../storage/local-library-storage';
import {
  buildSavedPlaylist,
  type PlaylistDraftIssue,
} from '../utils/saved-playlist-view-model';

type UseSavedPlaylistCreateDialogStateOptions = {
  createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  setSelectedPlaylistId: (playlistId: string) => void;
};

export const useSavedPlaylistCreateDialogState = (
  options: UseSavedPlaylistCreateDialogStateOptions,
) => {
  const [creationIssue, setCreationIssue] = useState<PlaylistDraftIssue | null>(
    null,
  );
  const [createPlaylistName, setCreatePlaylistName] = useState('');
  const [isCreatePlaylistDialogVisible, setIsCreatePlaylistDialogVisible] =
    useState(false);

  return {
    createPlaylistName,
    creationIssue,
    closeCreatePlaylistDialog() {
      setCreationIssue(null);
      setCreatePlaylistName('');
      setIsCreatePlaylistDialogVisible(false);
    },
    async handleCreatePlaylist() {
      const result = buildSavedPlaylist({
        name: createPlaylistName,
        ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
      });

      if (result.issue || !result.playlist) {
        setCreationIssue(result.issue);
        return;
      }

      const persistedPlaylist = await options.createPlaylist(result.playlist);

      if (!persistedPlaylist) {
        return;
      }

      setCreationIssue(null);
      setCreatePlaylistName('');
      setIsCreatePlaylistDialogVisible(false);
      options.setSelectedPlaylistId(persistedPlaylist.id);
    },
    handleCreatePlaylistNameChange(value: string) {
      setCreatePlaylistName(value);
      setCreationIssue(null);
    },
    isCreatePlaylistDialogVisible,
    openCreatePlaylistDialog() {
      setCreationIssue(null);
      setCreatePlaylistName('');
      setIsCreatePlaylistDialogVisible(true);
    },
  };
};
