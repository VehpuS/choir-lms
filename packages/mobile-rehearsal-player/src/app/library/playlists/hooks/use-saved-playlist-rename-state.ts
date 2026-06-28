import { renamePlaylist, type Playlist } from '@org/audio-library-models';
import { useEffect, useState } from 'react';

import {
  validatePlaylistName,
  type PlaylistDraftIssue,
} from '../utils/saved-playlist-view-model';

type UseSavedPlaylistRenameStateOptions = {
  persistSelectedPlaylist: (
    buildNextPlaylist: (playlist: Playlist) => Playlist,
  ) => Promise<Playlist | null | undefined>;
  selectedPlaylist: Playlist | null;
};

export const useSavedPlaylistRenameState = (
  options: UseSavedPlaylistRenameStateOptions,
) => {
  const [renameIssue, setRenameIssue] = useState<PlaylistDraftIssue | null>(
    null,
  );
  const [renamePlaylistName, setRenamePlaylistName] = useState('');

  useEffect(() => {
    setRenamePlaylistName(options.selectedPlaylist?.name ?? '');
    setRenameIssue(null);
  }, [options.selectedPlaylist?.id, options.selectedPlaylist?.name]);

  return {
    async handleRenamePlaylist() {
      if (!options.selectedPlaylist) {
        return;
      }

      const nextRenameIssue = validatePlaylistName(renamePlaylistName);

      if (nextRenameIssue) {
        setRenameIssue(nextRenameIssue);
        return;
      }

      setRenameIssue(null);

      await options.persistSelectedPlaylist((playlist) => {
        return renamePlaylist(playlist, renamePlaylistName);
      });
    },
    handleRenamePlaylistNameChange(value: string) {
      setRenamePlaylistName(value);
      setRenameIssue(null);
    },
    renameIssue,
    renamePlaylistName,
  };
};
