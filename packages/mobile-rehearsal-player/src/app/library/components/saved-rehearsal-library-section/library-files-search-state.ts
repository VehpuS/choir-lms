import type {
  LibraryFilesSearchScope,
  LibraryFilesSortMode,
} from '../../saved-rehearsal-library/library-files-model';

export type LibraryFilesSearchStateSnapshot = {
  activeSearchQuery: string | null;
  librarySearchQuery: string;
  searchScope: LibraryFilesSearchScope;
  sortMode: LibraryFilesSortMode;
};

export const restoreLibraryFilesSearchState = (
  options: LibraryFilesSearchStateSnapshot & {
    cancelPendingSearch: () => void;
    setActiveLibrarySearchQuery: (query: string | null) => void;
    setFilesSearchScope: (value: LibraryFilesSearchScope) => void;
    setFilesSortMode: (value: LibraryFilesSortMode) => void;
    setLibrarySearchQuery: (value: string) => void;
  },
) => {
  options.cancelPendingSearch();
  options.setLibrarySearchQuery(options.librarySearchQuery);
  options.setActiveLibrarySearchQuery(options.activeSearchQuery);
  options.setFilesSearchScope(options.searchScope);
  options.setFilesSortMode(options.sortMode);
};
