import { parseTimestamp } from '../../saved-rehearsal-library/library-files-model';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';

export type SavedSourceSortField = 'name' | 'date';
export type SavedSourceSortDirection = 'asc' | 'desc';

export type SavedSourceSortState = {
  direction: SavedSourceSortDirection;
  field: SavedSourceSortField;
};

export const DEFAULT_SAVED_SOURCE_SORT_STATE: SavedSourceSortState = {
  direction: 'asc',
  field: 'name',
};

export const SAVED_SOURCE_SORT_FIELD_OPTIONS: {
  label: string;
  value: SavedSourceSortField;
}[] = [
  { label: 'Name', value: 'name' },
  { label: 'Date added', value: 'date' },
];

const compareSourcesByName = (
  left: DriveLibrarySource,
  right: DriveLibrarySource,
) => {
  return left.name.localeCompare(right.name, undefined, {
    sensitivity: 'base',
  });
};

export const sortSavedSourcesBy = (
  sources: DriveLibrarySource[],
  sortState: SavedSourceSortState,
) => {
  const directionMultiplier = sortState.direction === 'asc' ? 1 : -1;

  return [...sources].sort((left, right) => {
    if (sortState.field === 'date') {
      const leftTimestamp = parseTimestamp(left.modifiedTime);
      const rightTimestamp = parseTimestamp(right.modifiedTime);

      return leftTimestamp !== rightTimestamp
        ? (leftTimestamp - rightTimestamp) * directionMultiplier
        : compareSourcesByName(left, right);
    }

    return compareSourcesByName(left, right) * directionMultiplier;
  });
};
