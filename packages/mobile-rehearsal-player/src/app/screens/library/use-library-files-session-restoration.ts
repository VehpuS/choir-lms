import { useEffect, useRef } from 'react';

import type { SavedRehearsalLibraryView } from '../../library/saved-rehearsal-library/detail-mode';
import type {
  LibraryFilesSearchScope,
  LibraryFilesSortMode,
} from '../../library/saved-rehearsal-library/library-files-model';
import {
  buildLibraryFilesSessionSnapshot,
  shouldCaptureLibraryFilesSession,
  shouldRestoreLibraryFilesSession,
} from './library-files-session-state';

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

    if (
      shouldCaptureLibraryFilesSession({
        currentView,
        previousView,
      })
    ) {
      snapshotRef.current = buildLibraryFilesSessionSnapshot({
        activeSearchQuery,
        currentFolderId: currentFilesFolderId,
        librarySearchQuery,
        scrollOffsetY: getCurrentScrollOffsetY(),
        searchScope: filesSearchScope,
        sortMode: filesSortMode,
      });
    }

    if (
      shouldRestoreLibraryFilesSession({
        currentView,
        previousView,
        snapshot: snapshotRef.current,
      })
    ) {
      const snapshot = snapshotRef.current;

      if (snapshot) {
        restoreLibraryFilesSearchState(snapshot);

        if (snapshot.currentFolderId) {
          openFilesFolder(snapshot.currentFolderId);
        }

        pendingScrollOffsetYRef.current = snapshot.scrollOffsetY;
      }
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
