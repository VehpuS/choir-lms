import type {
  DriveBrowseLocation,
  DriveDiscoveryResult,
} from '@org/google-drive';

import type {
  DriveLibraryFolder,
  DriveLibrarySource,
} from '../utils/drive-library-view-model';
import {
  createDriveBrowseFolderRows,
  createDriveBrowseSourceRows,
  createDriveSearchResultRows,
  type DriveDiscoveryExplorerRow,
} from './drive-explorer-row-model';

export type { DriveDiscoveryExplorerRow } from './drive-explorer-row-model';

export type DriveDiscoveryExplorerState = {
  breadcrumbs: Array<{
    isCurrent: boolean;
    key: string;
    label: string;
    locationIndex: number;
  }>;
  canGoBack: boolean;
  currentTitle: string;
  rows: DriveDiscoveryExplorerRow[];
};

type BuildDriveDiscoveryExplorerStateOptions = {
  browseFolders: DriveLibraryFolder[];
  browsePlayableSources: DriveLibrarySource[];
  browseUnavailableSources: DriveLibrarySource[];
  currentLocation: DriveBrowseLocation;
  isSearchMode: boolean;
  navigationStack: DriveBrowseLocation[];
  searchQuery: string | null;
  searchResults: DriveDiscoveryResult[];
};

export const buildDriveDiscoveryExplorerState = ({
  browseFolders,
  browsePlayableSources,
  browseUnavailableSources,
  currentLocation,
  isSearchMode,
  navigationStack,
  searchQuery,
  searchResults,
}: BuildDriveDiscoveryExplorerStateOptions): DriveDiscoveryExplorerState => {
  const rows = isSearchMode
    ? createDriveSearchResultRows({
        query: searchQuery ?? '',
        results: searchResults,
      })
    : [
        ...createDriveBrowseFolderRows(browseFolders),
        ...createDriveBrowseSourceRows([
          ...browsePlayableSources,
          ...browseUnavailableSources,
        ]),
      ];

  return {
    breadcrumbs: navigationStack.map((location, index) => {
      return {
        isCurrent: index === navigationStack.length - 1,
        key: `${location.kind}:${location.id}`,
        label: location.name,
        locationIndex: index,
      };
    }),
    canGoBack: navigationStack.length > 1,
    currentTitle: currentLocation.name,
    rows,
  };
};
