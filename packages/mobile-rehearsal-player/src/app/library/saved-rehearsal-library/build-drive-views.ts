import type { useDriveLibrary } from '../drive/hooks/use-drive-library';
import { getDriveSearchContextCopy } from '../drive/utils/drive-library-view-model';
import type { resolveDriveStatusCopies } from './resolve-drive-status-copies';

type DriveLibrary = ReturnType<typeof useDriveLibrary>;
type DriveStatusCopies = ReturnType<typeof resolveDriveStatusCopies>;

/** The Add screen's browse view of Google Drive (folders and audio). */
export const buildDriveDiscoveryView = ({
  canRefresh,
  driveLibrary,
  isSearchMode,
  statusCopy,
}: {
  canRefresh: boolean;
  driveLibrary: DriveLibrary;
  isSearchMode: boolean;
  statusCopy: DriveStatusCopies['discoveryStatusCopy'];
}) => {
  const { browseSnapshot, currentLocation } = driveLibrary;
  const isSharedRoot =
    currentLocation.rootKind === 'shared' && currentLocation.kind === 'root';
  const folderCount = browseSnapshot.folders.length;

  return {
    browseSnapshot,
    canReturnToSearchResults: driveLibrary.canReturnToSearchResults,
    canRefresh,
    currentLocation,
    folderTitle: isSharedRoot
      ? `Shared folders (${folderCount})`
      : `Folders (${folderCount})`,
    goToLocation: driveLibrary.goToLocation,
    isLoading: !isSearchMode && driveLibrary.isLoading,
    navigationStack: driveLibrary.navigationStack,
    openFolder: driveLibrary.openFolder,
    playableSourceTitle: `Audio in ${currentLocation.name} (${browseSnapshot.playableSources.length})`,
    playableSources: browseSnapshot.playableSources,
    refresh: driveLibrary.refresh,
    returnToSearchResults: driveLibrary.returnToSearchResults,
    selectRoot: driveLibrary.selectRoot,
    statusCopy,
    unavailableSourceTitle: `Unavailable or unsupported in ${currentLocation.name} (${browseSnapshot.unavailableSources.length})`,
    unavailableSources: browseSnapshot.unavailableSources,
  };
};

/** The Add screen's search view of Google Drive. */
export const buildDriveSearchView = ({
  canRefresh,
  driveLibrary,
  isSearchMode,
  statusCopy,
}: {
  canRefresh: boolean;
  driveLibrary: DriveLibrary;
  isSearchMode: boolean;
  statusCopy: DriveStatusCopies['searchStatusCopy'];
}) => {
  const { searchSnapshot } = driveLibrary;

  return {
    activeSearchQuery: driveLibrary.activeSearchQuery,
    canSearch: canRefresh,
    clearSearch: driveLibrary.clearSearch,
    commitSearchQuery: driveLibrary.commitSearchQuery,
    deactivateSearch: driveLibrary.deactivateSearch,
    isLoading: isSearchMode && driveLibrary.isLoading,
    isSearchMode,
    playableSourceTitle: `Matching audio (${searchSnapshot.playableSources.length})`,
    playableSources: searchSnapshot.playableSources,
    recentSearchTerms: driveLibrary.recentSearchTerms,
    results: driveLibrary.searchResults,
    searchContextCopy: getDriveSearchContextCopy(driveLibrary.currentLocation),
    searchQuery: driveLibrary.searchQuery,
    selection: driveLibrary.searchSelection,
    setSearchQuery: driveLibrary.setSearchQuery,
    statusCopy,
    submitSearch: driveLibrary.submitSearch,
    submitSearchQuery: driveLibrary.submitSearchQuery,
    totalResultCount: driveLibrary.searchResults.length,
    unavailableSourceTitle: `Unavailable or unsupported results (${searchSnapshot.unavailableSources.length})`,
    unavailableSources: searchSnapshot.unavailableSources,
  };
};
