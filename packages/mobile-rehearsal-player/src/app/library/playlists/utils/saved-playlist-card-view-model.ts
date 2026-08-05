import type { Playlist } from '@org/audio-library-models';

export type SavedPlaylistCard = {
  detailLabel: string;
  playlist: Playlist;
  previewLabel: string | null;
};

export type SavedPlaylistCardPlayAction = {
  accessibilityLabel: string;
  disabled: boolean;
};

export type SavedPlaylistCardRenameTarget = {
  playlistId: string;
  playlistName: string;
  value: string;
};

const pluralize = (count: number, noun: string) => {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
};

const EMPTY_PLAYLIST_DETAIL_LABEL = 'Empty playlist';

const getPlaylistDetailLabel = (playlist: Playlist) => {
  if (playlist.items.length === 0) {
    return EMPTY_PLAYLIST_DETAIL_LABEL;
  }

  const trackCount = playlist.items.filter((entry) => {
    return entry.kind === 'track';
  }).length;
  const loopCount = playlist.items.length - trackCount;

  return [
    pluralize(playlist.items.length, 'item'),
    pluralize(trackCount, 'track'),
    pluralize(loopCount, 'loop'),
  ].join(' • ');
};

const getPlaylistPreviewLabel = (playlist: Playlist) => {
  if (playlist.items.length === 0) {
    return null;
  }

  return playlist.items
    .slice(0, 3)
    .map((entry) => entry.title)
    .join(' • ');
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

export const resolveSavedPlaylistCards = (
  playlists: Playlist[],
): SavedPlaylistCard[] => {
  return playlists.map((playlist) => {
    return {
      detailLabel: getPlaylistDetailLabel(playlist),
      playlist,
      previewLabel: getPlaylistPreviewLabel(playlist),
    };
  });
};
