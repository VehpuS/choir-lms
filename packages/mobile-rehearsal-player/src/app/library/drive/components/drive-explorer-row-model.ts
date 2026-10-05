import type { DriveDiscoveryResult } from '@org/google-drive';

import {
  getBrowseFolderMetadataLabels,
  getBrowseSourceMetadataLabels,
  getSearchFolderMetadataLabels,
  getSearchSourceMetadataLabels,
} from '../utils/drive-browse-row-metadata';
import type {
  DriveLibraryFolder,
  DriveLibrarySource,
} from '../utils/drive-library-view-model';

type DriveExplorerRowPresentation = {
  highlightQuery: string | null;
  key: string;
  metadataLabels: string[];
};

export type DriveDiscoveryExplorerRow =
  | (DriveExplorerRowPresentation & {
      folder: DriveLibraryFolder;
      kind: 'folder';
    })
  | (DriveExplorerRowPresentation & {
      kind: 'source';
      source: DriveLibrarySource;
    });

export const createDriveBrowseFolderRows = (
  folders: DriveLibraryFolder[],
  now: Date = new Date(),
): DriveDiscoveryExplorerRow[] => {
  return folders.map((folder) => {
    return {
      folder,
      highlightQuery: null,
      key: folder.id,
      kind: 'folder',
      metadataLabels: getBrowseFolderMetadataLabels(folder, now),
    };
  });
};

export const createDriveBrowseSourceRows = (
  sources: DriveLibrarySource[],
): DriveDiscoveryExplorerRow[] => {
  return sources.map((source) => {
    return {
      highlightQuery: null,
      key: source.id,
      kind: 'source',
      metadataLabels: getBrowseSourceMetadataLabels(source),
      source,
    };
  });
};

export const resolveDriveDiscoveryResultFromRow = (
  row: DriveDiscoveryExplorerRow,
): DriveDiscoveryResult => {
  return row.kind === 'folder'
    ? { ...row.folder, kind: 'folder' }
    : { ...row.source, kind: 'audio' };
};

export const getDriveExplorerRowSelectionState = (options: {
  isSelectionMode: boolean;
  row: DriveDiscoveryExplorerRow;
  selectedResultIds?: ReadonlySet<string>;
}): boolean | undefined => {
  if (!options.isSelectionMode) {
    return undefined;
  }

  return options.selectedResultIds?.has(options.row.key) ?? false;
};

export const createDriveSearchResultRows = (options: {
  now?: Date;
  query: string;
  results: DriveDiscoveryResult[];
}): DriveDiscoveryExplorerRow[] => {
  const now = options.now ?? new Date();

  return options.results.map((result) => {
    if (result.kind === 'folder') {
      return {
        folder: result,
        highlightQuery: options.query,
        key: result.id,
        kind: 'folder',
        metadataLabels: getSearchFolderMetadataLabels(result, now),
      };
    }

    return {
      highlightQuery: options.query,
      key: result.id,
      kind: 'source',
      metadataLabels: getSearchSourceMetadataLabels(result),
      source: result,
    };
  });
};
