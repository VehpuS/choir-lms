import type { DriveDiscoveryResult } from '@org/google-drive';

import {
  getFolderMetadataLabels,
  getSourceMetadataLabels,
  type DriveLibraryFolder,
  type DriveLibrarySource,
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
): DriveDiscoveryExplorerRow[] => {
  return folders.map((folder) => {
    return {
      folder,
      highlightQuery: null,
      key: folder.id,
      kind: 'folder',
      metadataLabels: getFolderMetadataLabels(folder),
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
      metadataLabels: getSourceMetadataLabels(source),
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
  query: string;
  results: DriveDiscoveryResult[];
}): DriveDiscoveryExplorerRow[] => {
  return options.results.map((result) => {
    if (result.kind === 'folder') {
      return {
        folder: result,
        highlightQuery: options.query,
        key: result.id,
        kind: 'folder',
        metadataLabels: [
          'Folder',
          ...getFolderMetadataLabels(result, { includeUpdatedDate: true }),
          ...(result.locationLabel ? [result.locationLabel] : []),
        ],
      };
    }

    return {
      highlightQuery: options.query,
      key: result.id,
      kind: 'source',
      metadataLabels: [
        'Audio',
        ...getSourceMetadataLabels(result, { includeUpdatedDate: true }),
      ],
      source: result,
    };
  });
};
