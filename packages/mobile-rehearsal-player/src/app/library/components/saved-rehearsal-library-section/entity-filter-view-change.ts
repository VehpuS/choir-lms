import type { LibrarySearchEntityFilter } from '../../search/utils/saved-library-search-view-model';

export const resolveEntityFilterOnViewChange = (
  activeLibrarySearchQuery: string | null,
  currentEntityFilter: LibrarySearchEntityFilter,
): LibrarySearchEntityFilter => {
  return activeLibrarySearchQuery === null ? 'all' : currentEntityFilter;
};
