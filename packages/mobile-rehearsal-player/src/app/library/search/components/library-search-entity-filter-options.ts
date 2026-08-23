import type { LibrarySearchEntityFilter } from '../utils/saved-library-search-view-model';

export const ENTITY_FILTER_OPTIONS: {
  label: string;
  value: LibrarySearchEntityFilter;
}[] = [
  { label: 'All', value: 'all' },
  { label: 'Tracks', value: 'tracks' },
  { label: 'Loops', value: 'loops' },
  { label: 'Playlists', value: 'playlists' },
];
