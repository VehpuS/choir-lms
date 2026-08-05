import { useEffect, useRef } from 'react';

import type { SavedRehearsalLibraryView } from '../../library/saved-rehearsal-library/detail-mode';
import type {
  LibraryFilesSearchScope,
  LibraryFilesSortMode,
} from '../../library/saved-rehearsal-library/library-files-model';
import { resolveLibraryFilesSessionTransition } from './library-files-session-state';

type UseLibraryFilesSessionRestorationOptions = {
  activeSearchQuery: string | null;
  currentFilesFolderId: string | null;
  currentView: SavedRehearsalLibraryView;
  filesSearchScope: LibraryFilesSearchScope;
  filesSortMode: LibraryFilesSortMode;
  getCurrentScrollOffsetY: () => number;
  librarySearchQuery: string;
  openFilesFolder: (folderId: string) => void;
  restoreLibraryFilesSearchState: (options: {
    activeSearchQuery: string | null;
    librarySearchQuery: string;
    searchScope: LibraryFilesSearchScope;
    sortMode: LibraryFilesSortMode;
  }) => void;
  restoreScrollOffsetY: (offsetY: number) => void;
};

export const useLibraryFilesSessionRestoration = ({
  activeSearchQuery,
  currentFilesFolderId,
  currentView,
  filesSearchScope,
  filesSortMode,
  getCurrentScrollOffsetY,
  librarySearchQuery,
  openFilesFolder,
  restoreLibraryFilesSearchState,
  restoreScrollOffsetY,
}: UseLibraryFilesSessionRestorationOptions) => {
  const previousViewRef = useRef(currentView);
  const snapshotRef = useRef<ReturnType<
    typeof buildLibraryFilesSessionSnapshot
  > | null>(null);
  const pendingScrollOffsetYRef = useRef<number | null>(null);

  useEffect(() => {
    const previousView = previousViewRef.current;

    const transition = resolveLibraryFilesSessionTransition({
      activeSearchQuery,
      currentFolderId: currentFilesFolderId,
      currentView,
      filesSearchScope,
      filesSortMode,
      librarySearchQuery,
      previousView,
      scrollOffsetY: getCurrentScrollOffsetY(),
      snapshot: snapshotRef.current,
    });

    snapshotRef.current = transition.nextSnapshot;

    if (transition.restoredSnapshot) {
      restoreLibraryFilesSearchState(transition.restoredSnapshot);

      if (transition.restoredSnapshot.currentFolderId) {
        openFilesFolder(transition.restoredSnapshot.currentFolderId);
      }

      pendingScrollOffsetYRef.current = transition.scrollOffsetYToRestore;
    }

    previousViewRef.current = currentView;
  }, [
    activeSearchQuery,
    currentFilesFolderId,
    currentView,
    filesSearchScope,
    filesSortMode,
    getCurrentScrollOffsetY,
    librarySearchQuery,
    openFilesFolder,
    restoreLibraryFilesSearchState,
  ]);

  useEffect(() => {
    if (currentView !== 'files') {
      return;
    }

    const pendingScrollOffsetY = pendingScrollOffsetYRef.current;

    if (pendingScrollOffsetY === null) {
      return;
    }

    restoreScrollOffsetY(pendingScrollOffsetY);
    pendingScrollOffsetYRef.current = null;
  }, [
    activeSearchQuery,
    currentFilesFolderId,
    currentView,
    filesSearchScope,
    filesSortMode,
    librarySearchQuery,
    restoreScrollOffsetY,
  ]);
};
