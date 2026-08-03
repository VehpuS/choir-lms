import type { SavedRehearsalLibraryView } from '../../library/saved-rehearsal-library/detail-mode';
import type {
  LibraryFilesSearchScope,
  LibraryFilesSortMode,
} from '../../library/saved-rehearsal-library/library-files-model';

export type LibraryFilesSessionSnapshot = {
  activeSearchQuery: string | null;
  currentFolderId: string | null;
  librarySearchQuery: string;
  searchScope: LibraryFilesSearchScope;
  sortMode: LibraryFilesSortMode;
  scrollOffsetY: number;
};

export const buildLibraryFilesSessionSnapshot = (options: {
  activeSearchQuery: string | null;
  currentFolderId: string | null;
  librarySearchQuery: string;
  searchScope: LibraryFilesSearchScope;
  sortMode: LibraryFilesSortMode;
  scrollOffsetY: number;
}): LibraryFilesSessionSnapshot => {
  return {
    activeSearchQuery: options.activeSearchQuery,
    currentFolderId: options.currentFolderId,
    librarySearchQuery: options.librarySearchQuery,
    searchScope: options.searchScope,
    sortMode: options.sortMode,
    scrollOffsetY: options.scrollOffsetY,
  };
};

export const shouldCaptureLibraryFilesSession = (options: {
  currentView: SavedRehearsalLibraryView;
  previousView: SavedRehearsalLibraryView;
}) => {
  return options.previousView === 'files' && options.currentView !== 'files';
};

export const shouldRestoreLibraryFilesSession = (options: {
  currentView: SavedRehearsalLibraryView;
  previousView: SavedRehearsalLibraryView;
  snapshot: LibraryFilesSessionSnapshot | null;
}) => {
  return (
    options.previousView !== 'files' &&
    options.currentView === 'files' &&
    options.snapshot !== null
  );
};
