import type {
  LibraryFilesSearchScope,
  LibraryFilesSortDirection,
  LibraryFilesSortMode,
} from '../../saved-rehearsal-library/library-files-model';

export type LibraryFilesSearchStateSnapshot = {
  activeSearchQuery: string | null;
  librarySearchQuery: string;
  searchScope: LibraryFilesSearchScope;
  sortDirection: LibraryFilesSortDirection;
  sortMode: LibraryFilesSortMode;
};

export const restoreLibraryFilesSearchState = (
  options: LibraryFilesSearchStateSnapshot & {
    cancelPendingSearch: () => void;
    setActiveLibrarySearchQuery: (query: string | null) => void;
    setFilesSearchScope: (value: LibraryFilesSearchScope) => void;
    setFilesSortDirection: (value: LibraryFilesSortDirection) => void;
    setFilesSortMode: (value: LibraryFilesSortMode) => void;
    setLibrarySearchQuery: (value: string) => void;
  },
) => {
  options.cancelPendingSearch();
  options.setLibrarySearchQuery(options.librarySearchQuery);
  options.setActiveLibrarySearchQuery(options.activeSearchQuery);
  options.setFilesSearchScope(options.searchScope);
  options.setFilesSortDirection(options.sortDirection);
  options.setFilesSortMode(options.sortMode);
};
