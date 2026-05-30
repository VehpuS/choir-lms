import type { Playlist } from '@org/audio-library-models';

export type SavedPlaylistCardPlayAction = {
  accessibilityLabel: string;
  disabled: boolean;
};

export const getSavedPlaylistCardPlayAction = (
  playlist: Pick<Playlist, 'items' | 'name'>,
): SavedPlaylistCardPlayAction => {
  return {
    accessibilityLabel: `Play ${playlist.name}`,
    disabled: playlist.items.length === 0,
  };
};