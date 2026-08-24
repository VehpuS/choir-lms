import { useState } from 'react';

import {
  DEFAULT_LIBRARY_FILES_SORT_DIRECTION,
  DEFAULT_LIBRARY_FILES_SORT_MODE,
  type LibraryFilesSearchScope,
  type LibraryFilesSortDirection,
  type LibraryFilesSortMode,
} from '../../saved-rehearsal-library/library-files-model';
import {
  restoreLibraryFilesSearchState,
  type LibraryFilesSearchStateSnapshot,
} from './library-files-search-state';

export const useLibraryFilesSearchState = () => {
  const [filesSearchScope, setFilesSearchScope] =
    useState<LibraryFilesSearchScope>('current-folder');
  const [filesSortMode, setFilesSortMode] = useState<LibraryFilesSortMode>(
    DEFAULT_LIBRARY_FILES_SORT_MODE,
  );
  const [filesSortDirection, setFilesSortDirection] =
    useState<LibraryFilesSortDirection>(DEFAULT_LIBRARY_FILES_SORT_DIRECTION);
  const [filesOpenedAtByNodeKey, setFilesOpenedAtByNodeKey] = useState<
    Record<string, string>
  >({});

  return {
    filesOpenedAtByNodeKey,
    filesSearchScope,
    filesSortDirection,
    filesSortMode,
    recordFilesEntryOpened(
      nodeKey: string,
      openedAt = new Date().toISOString(),
    ) {
      setFilesOpenedAtByNodeKey((currentValue) => {
        if (currentValue[nodeKey] === openedAt) {
          return currentValue;
        }

        return {
          ...currentValue,
          [nodeKey]: openedAt,
        };
      });
    },
    restoreLibraryFilesSearchState(
      options: LibraryFilesSearchStateSnapshot & {
        cancelPendingSearch: () => void;
        setActiveLibrarySearchQuery: (query: string | null) => void;
        setLibrarySearchQuery: (value: string) => void;
      },
    ) {
      restoreLibraryFilesSearchState({
        ...options,
        setFilesSearchScope,
        setFilesSortDirection,
        setFilesSortMode,
      });
    },
    setFilesSearchScope,
    setFilesSortDirection,
    setFilesSortMode,
    toggleFilesSortDirection() {
      setFilesSortDirection((currentDirection) => {
        return currentDirection === 'asc' ? 'desc' : 'asc';
      });
    },
  };
};
