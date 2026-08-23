import type { SavedPlaylistCard } from '../../playlists/utils/saved-playlist-card-view-model';
import { parseTimestamp } from '../../saved-rehearsal-library/library-files-model';

export type SavedPlaylistSortField = 'name' | 'date';
export type SavedPlaylistSortDirection = 'asc' | 'desc';

export type SavedPlaylistSortState = {
  direction: SavedPlaylistSortDirection;
  field: SavedPlaylistSortField;
};

export const DEFAULT_SAVED_PLAYLIST_SORT_STATE: SavedPlaylistSortState = {
  direction: 'asc',
  field: 'name',
};

export const SAVED_PLAYLIST_SORT_FIELD_OPTIONS: {
  label: string;
  value: SavedPlaylistSortField;
}[] = [
  { label: 'Name', value: 'name' },
  { label: 'Date added', value: 'date' },
];

const comparePlaylistCardsByName = (
  left: SavedPlaylistCard,
  right: SavedPlaylistCard,
) => {
  return left.playlist.name.localeCompare(right.playlist.name, undefined, {
    sensitivity: 'base',
  });
};

export const sortSavedPlaylistsBy = (
  playlistCards: SavedPlaylistCard[],
  sortState: SavedPlaylistSortState,
) => {
  const directionMultiplier = sortState.direction === 'asc' ? 1 : -1;

  return [...playlistCards].sort((left, right) => {
    if (sortState.field === 'date') {
      const leftTimestamp = parseTimestamp(left.playlist.createdAt);
      const rightTimestamp = parseTimestamp(right.playlist.createdAt);

      return leftTimestamp !== rightTimestamp
        ? (leftTimestamp - rightTimestamp) * directionMultiplier
        : comparePlaylistCardsByName(left, right);
    }

    return comparePlaylistCardsByName(left, right) * directionMultiplier;
  });
};
