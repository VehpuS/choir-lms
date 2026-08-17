import type { RehearsalLibraryTagUsage } from '@org/audio-library-runtime';

import { normalizeSearchQuery } from '../../../search/utils/saved-library-search-view-model';

const pluralize = (count: number, noun: string) => {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
};

export const EMPTY_SAVED_TAGS_MESSAGE =
  'No tags yet. Tag a track, loop, playlist, or folder in Library to see it here.';

export const NO_SAVED_TAGS_SEARCH_RESULTS_MESSAGE = 'No tags match your search.';

export const getSavedTagUsageMetadataLabel = (
  usage: RehearsalLibraryTagUsage,
) => {
  return pluralize(usage.count, 'item');
};

export type SavedTagsListSortField = 'count' | 'name';
export type SavedTagsListSortDirection = 'asc' | 'desc';

export type SavedTagsListSortState = {
  direction: SavedTagsListSortDirection;
  field: SavedTagsListSortField;
};

export const DEFAULT_SAVED_TAGS_LIST_SORT_STATE: SavedTagsListSortState = {
  direction: 'desc',
  field: 'count',
};

export const SAVED_TAGS_LIST_SORT_FIELD_OPTIONS: {
  label: string;
  value: SavedTagsListSortField;
}[] = [
  { label: 'Name', value: 'name' },
  { label: 'Count', value: 'count' },
];

const compareTagUsageByName = (
  left: RehearsalLibraryTagUsage,
  right: RehearsalLibraryTagUsage,
) => {
  return left.tag.localeCompare(right.tag, undefined, { sensitivity: 'base' });
};

export const sortSavedTagUsage = (
  tagUsage: RehearsalLibraryTagUsage[],
  sortState: SavedTagsListSortState,
) => {
  const directionMultiplier = sortState.direction === 'asc' ? 1 : -1;

  return [...tagUsage].sort((left, right) => {
    if (sortState.field === 'count') {
      return left.count !== right.count
        ? (left.count - right.count) * directionMultiplier
        : compareTagUsageByName(left, right);
    }

    return compareTagUsageByName(left, right) * directionMultiplier;
  });
};

export const getSavedTagsListSortDirectionToggleLabel = (
  currentDirection: SavedTagsListSortDirection,
) => {
  return currentDirection === 'asc' ? 'Sort descending' : 'Sort ascending';
};

export const filterSavedTagUsageByQuery = (
  tagUsage: RehearsalLibraryTagUsage[],
  query: string,
) => {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) {
    return tagUsage;
  }

  return tagUsage.filter((usage) => {
    return usage.tag.toLocaleLowerCase().includes(normalizedQuery);
  });
};
