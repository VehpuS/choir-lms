import type { RehearsalLibraryTagMatch } from '@org/audio-library-runtime';

import { normalizeSearchQuery } from '../../../search/utils/saved-library-search-view-model';
import { formatDurationLabel } from '../../../drive/utils/drive-library-view-model';
import { getSavedTagsListSortDirectionToggleLabel } from '../saved-tags-list/model';

export { getSavedTagsListSortDirectionToggleLabel as getTagMatchListSortDirectionToggleLabel };

const pluralize = (count: number, noun: string) => {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
};

export const EMPTY_TAG_MATCH_LIST_MESSAGE =
  'Nothing is tagged with this yet.';

export const NO_TAG_MATCH_RESULTS_MESSAGE =
  'No matches for the selected filters.';

const TAG_MATCH_TYPE_LABELS: Record<RehearsalLibraryTagMatch['kind'], string> =
  {
    track: 'Track',
    loop: 'Loop',
    playlist: 'Playlist',
    folder: 'Folder',
  };

const TAG_MATCH_TYPE_ORDER: Record<RehearsalLibraryTagMatch['kind'], number> =
  {
    track: 0,
    loop: 1,
    playlist: 2,
    folder: 3,
  };

export const getTagMatchKey = (match: RehearsalLibraryTagMatch) => {
  return `${match.kind}:${match.item.id}`;
};

export const getTagMatchTitle = (match: RehearsalLibraryTagMatch) => {
  return match.item.name;
};

export const getTagMatchTypeLabel = (match: RehearsalLibraryTagMatch) => {
  return TAG_MATCH_TYPE_LABELS[match.kind];
};

export const getTagMatchIconName = (match: RehearsalLibraryTagMatch) => {
  switch (match.kind) {
    case 'folder':
      return 'folder-outline' as const;
    case 'loop':
      return 'repeat' as const;
    case 'playlist':
      return 'playlist-music-outline' as const;
    default:
      return 'music-note-outline' as const;
  }
};

export const getTagMatchCreatedAt = (match: RehearsalLibraryTagMatch) => {
  return match.item.createdAt;
};

export const getTagMatchMetadataLabel = (match: RehearsalLibraryTagMatch) => {
  switch (match.kind) {
    case 'track':
      return formatDurationLabel(match.item.durationMs) ?? TAG_MATCH_TYPE_LABELS.track;
    case 'loop':
      return (
        formatDurationLabel(match.item.endMs - match.item.startMs) ??
        TAG_MATCH_TYPE_LABELS.loop
      );
    case 'playlist':
      return pluralize(match.item.items.length, 'item');
    case 'folder':
      return TAG_MATCH_TYPE_LABELS.folder;
  }
};

export type TagMatchListSortField = 'date' | 'name' | 'type';
export type TagMatchListSortDirection = 'asc' | 'desc';

export type TagMatchListSortState = {
  direction: TagMatchListSortDirection;
  field: TagMatchListSortField;
};

export const DEFAULT_TAG_MATCH_LIST_SORT_STATE: TagMatchListSortState = {
  direction: 'asc',
  field: 'name',
};

export const TAG_MATCH_LIST_SORT_FIELD_OPTIONS: {
  label: string;
  value: TagMatchListSortField;
}[] = [
  { label: 'Name', value: 'name' },
  { label: 'Type', value: 'type' },
  { label: 'Date added', value: 'date' },
];

const compareMatchesByName = (
  left: RehearsalLibraryTagMatch,
  right: RehearsalLibraryTagMatch,
) => {
  return getTagMatchTitle(left).localeCompare(getTagMatchTitle(right), undefined, {
    sensitivity: 'base',
  });
};

export const sortTagMatches = (
  matches: RehearsalLibraryTagMatch[],
  sortState: TagMatchListSortState,
) => {
  const directionMultiplier = sortState.direction === 'asc' ? 1 : -1;

  return [...matches].sort((left, right) => {
    if (sortState.field === 'type') {
      const leftTypeOrder = TAG_MATCH_TYPE_ORDER[left.kind];
      const rightTypeOrder = TAG_MATCH_TYPE_ORDER[right.kind];

      return leftTypeOrder !== rightTypeOrder
        ? (leftTypeOrder - rightTypeOrder) * directionMultiplier
        : compareMatchesByName(left, right);
    }

    if (sortState.field === 'date') {
      const leftCreatedAt = getTagMatchCreatedAt(left);
      const rightCreatedAt = getTagMatchCreatedAt(right);

      return leftCreatedAt !== rightCreatedAt
        ? (leftCreatedAt < rightCreatedAt ? -1 : 1) * directionMultiplier
        : compareMatchesByName(left, right);
    }

    return compareMatchesByName(left, right) * directionMultiplier;
  });
};

export type TagMatchTypeFilterValue = RehearsalLibraryTagMatch['kind'];

export const TAG_MATCH_TYPE_FILTER_OPTIONS: {
  label: string;
  value: TagMatchTypeFilterValue;
}[] = [
  { label: 'Tracks', value: 'track' },
  { label: 'Loops', value: 'loop' },
  { label: 'Playlists', value: 'playlist' },
  { label: 'Folders', value: 'folder' },
];

export const filterTagMatchesByType = (
  matches: RehearsalLibraryTagMatch[],
  selectedTypes: TagMatchTypeFilterValue[],
) => {
  if (selectedTypes.length === 0) {
    return matches;
  }

  return matches.filter((match) => selectedTypes.includes(match.kind));
};

export const filterTagMatchesByQuery = (
  matches: RehearsalLibraryTagMatch[],
  query: string,
) => {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) {
    return matches;
  }

  return matches.filter((match) => {
    return getTagMatchTitle(match).toLocaleLowerCase().includes(normalizedQuery);
  });
};
