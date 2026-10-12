import type { DriveAuthorizationState } from '@org/google-drive';

import type { useDriveLibrary } from '../drive/hooks/use-drive-library';
import { getDriveLibraryStatusCopy } from '../drive/utils/drive-library-view-model';

// The status card for the folder being browsed and the one for the active
// search: only the mode that is running shows its loading state or issue.
export const resolveDriveStatusCopies = (options: {
  authState: DriveAuthorizationState;
  driveLibrary: ReturnType<typeof useDriveLibrary>;
  googleAuthConfigured: boolean;
  isSearchMode: boolean;
}) => {
  const { authState, driveLibrary, googleAuthConfigured, isSearchMode } =
    options;

  return {
    discoveryStatusCopy: getDriveLibraryStatusCopy({
      authState,
      activeSearchQuery: null,
      browseSnapshot: driveLibrary.browseSnapshot,
      currentBrowseLocation: driveLibrary.currentLocation,
      googleAuthConfigured,
      isLoading: !isSearchMode && driveLibrary.isLoading,
      issue: isSearchMode ? null : driveLibrary.issue,
      searchSnapshot: driveLibrary.searchSnapshot,
    }),
    searchStatusCopy: getDriveLibraryStatusCopy({
      authState,
      activeSearchQuery: driveLibrary.activeSearchQuery,
      browseSnapshot: driveLibrary.browseSnapshot,
      currentSearchLocation: driveLibrary.currentLocation,
      googleAuthConfigured,
      isLoading: isSearchMode && driveLibrary.isLoading,
      issue: isSearchMode ? driveLibrary.issue : null,
      searchSnapshot: driveLibrary.searchSnapshot,
    }),
  };
};
