import type { NamedLoop } from '@org/audio-library-models';

import { parseTimestamp } from '../../saved-rehearsal-library/library-files-model';

export type SavedLoopSortField = 'name' | 'date';
export type SavedLoopSortDirection = 'asc' | 'desc';

export type SavedLoopSortState = {
  direction: SavedLoopSortDirection;
  field: SavedLoopSortField;
};

export const DEFAULT_SAVED_LOOP_SORT_STATE: SavedLoopSortState = {
  direction: 'asc',
  field: 'name',
};

export const SAVED_LOOP_SORT_FIELD_OPTIONS: {
  label: string;
  value: SavedLoopSortField;
}[] = [
  { label: 'Name', value: 'name' },
  { label: 'Date added', value: 'date' },
];

const compareLoopsByName = (left: NamedLoop, right: NamedLoop) => {
  return left.name.localeCompare(right.name, undefined, {
    sensitivity: 'base',
  });
};

export const sortSavedLoopsBy = (
  loops: NamedLoop[],
  sortState: SavedLoopSortState,
) => {
  const directionMultiplier = sortState.direction === 'asc' ? 1 : -1;

  return [...loops].sort((left, right) => {
    if (sortState.field === 'date') {
      const leftTimestamp = parseTimestamp(left.createdAt);
      const rightTimestamp = parseTimestamp(right.createdAt);

      return leftTimestamp !== rightTimestamp
        ? (leftTimestamp - rightTimestamp) * directionMultiplier
        : compareLoopsByName(left, right);
    }

    return compareLoopsByName(left, right) * directionMultiplier;
  });
};
