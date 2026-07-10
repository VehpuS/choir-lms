import type { DriveBrowseLocation } from '@org/google-drive';

import type {
  DriveLibraryFolder,
  DriveLibrarySource,
} from '../utils/drive-library-view-model';

export type DriveDiscoveryExplorerRow =
  | {
      folder: DriveLibraryFolder;
      key: string;
      kind: 'folder';
    }
  | {
      key: string;
      kind: 'source';
      source: DriveLibrarySource;
    };

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
  searchPlayableSources: DriveLibrarySource[];
  searchUnavailableSources: DriveLibrarySource[];
};

const createFolderRows = (folders: DriveLibraryFolder[]) => {
  return folders.map((folder) => {
    return {
      folder,
      key: folder.id,
      kind: 'folder' as const,
    };
  });
};

const createSourceRows = (sources: DriveLibrarySource[]) => {
  return sources.map((source) => {
    return {
      key: source.id,
      kind: 'source' as const,
      source,
    };
  });
};

export const buildDriveDiscoveryExplorerState = ({
  browseFolders,
  browsePlayableSources,
  browseUnavailableSources,
  currentLocation,
  isSearchMode,
  navigationStack,
  searchPlayableSources,
  searchUnavailableSources,
}: BuildDriveDiscoveryExplorerStateOptions): DriveDiscoveryExplorerState => {
  const sourceRows = createSourceRows(
    isSearchMode
      ? [...searchPlayableSources, ...searchUnavailableSources]
      : [...browsePlayableSources, ...browseUnavailableSources],
  );
  const folderRows = isSearchMode ? [] : createFolderRows(browseFolders);

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
    rows: [...folderRows, ...sourceRows],
  };
};
