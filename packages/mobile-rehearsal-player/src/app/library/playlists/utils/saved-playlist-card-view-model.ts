import type { Playlist } from '@org/audio-library-models';

import type { SavedPlaylistCard } from './saved-playlist-view-model';

export type SavedPlaylistCardPlayAction = {
  accessibilityLabel: string;
  disabled: boolean;
};

export type SavedPlaylistCardRenameTarget = {
  playlistId: string;
  playlistName: string;
  value: string;
};

export const getSavedPlaylistCardPlayAction = (
  playlist: Pick<Playlist, 'items' | 'name'>,
): SavedPlaylistCardPlayAction => {
  return {
    accessibilityLabel: `Play ${playlist.name}`,
    disabled: playlist.items.length === 0,
  };
};

export const resolveSavedPlaylistCardRenameTarget = (
  playlistCards: SavedPlaylistCard[],
  playlistId: string | null,
): SavedPlaylistCardRenameTarget | null => {
  if (!playlistId) {
    return null;
  }

  const playlistCard = playlistCards.find((currentPlaylistCard) => {
    return currentPlaylistCard.playlist.id === playlistId;
  });

  if (!playlistCard) {
    return null;
  }

  return {
    playlistId: playlistCard.playlist.id,
    playlistName: playlistCard.playlist.name,
    value: playlistCard.playlist.name,
  };
};