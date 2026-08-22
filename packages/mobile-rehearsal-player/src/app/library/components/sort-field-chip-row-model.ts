export type SortFieldChipRowDirection = 'asc' | 'desc';

export type SortDirectionIcon = 'sort-ascending' | 'sort-descending';

export const resolveSortDirectionIcon = (
  direction: SortFieldChipRowDirection,
): SortDirectionIcon => {
  return direction === 'asc' ? 'sort-ascending' : 'sort-descending';
};
