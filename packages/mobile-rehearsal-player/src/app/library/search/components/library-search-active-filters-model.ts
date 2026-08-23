import { ENTITY_FILTER_OPTIONS } from './library-search-entity-filter-options';
import type { LibrarySearchEntityFilter } from '../utils/saved-library-search-view-model';

const pluralize = (count: number, noun: string) => {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
};

const ENTITY_FILTER_LABEL_BY_VALUE = new Map(
  ENTITY_FILTER_OPTIONS.map((option) => {
    return [option.value, option.label] as const;
  }),
);

export const resolveActiveFiltersSummaryLabel = (
  entityFilter: LibrarySearchEntityFilter,
  selectedTagFilters: string[],
): string | null => {
  const labelParts: string[] = [];

  if (entityFilter !== 'all') {
    labelParts.push(
      ENTITY_FILTER_LABEL_BY_VALUE.get(entityFilter) ?? entityFilter,
    );
  }

  if (selectedTagFilters.length > 0) {
    labelParts.push(pluralize(selectedTagFilters.length, 'tag'));
  }

  return labelParts.length > 0 ? labelParts.join(' • ') : null;
};
