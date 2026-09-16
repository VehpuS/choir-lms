import {
  createEmptyDriveSearchSnapshot,
  isDriveFolder,
  parseDriveBrowseSnapshot,
  parseDriveLibrarySnapshot,
  type DriveBrowseLocation,
} from './drive-discovery-models';
import {
  createBrowseQuery,
  createDriveSearchQuery,
  createFolderDescendantQuery,
  DRIVE_LIBRARY_QUERY,
  FOLDER_AUDIO_SEARCH_BATCH_SIZE,
  FOLDER_SCOPE_BATCH_SIZE,
  MY_DRIVE_ROOT_LOCATION,
  SHARED_FOLDERS_ROOT_LOCATION,
  splitIntoBatches,
} from './drive-file-queries';
import {
  requestAllDriveFilesWithFallback,
  requestDriveFileMetadataWithFallback,
  requestDriveFilesWithFallback,
} from './drive-files-client';
import { resolveDriveFilePaths } from './drive-path-resolver';
import {
  mapDriveFileToAudioSource,
  type DriveFileMetadata,
} from './google-drive-core';
import {
  createProgressiveDriveSearch,
  type DriveSearchProgressCallback,
} from './progressive-drive-search';

export type {
  DriveAudioDiscoveryResult,
  DriveBrowseLocation,
  DriveBrowseRootKind,
  DriveBrowseSnapshot,
  DriveDiscoveredAudioSource,
  DriveDiscoveryResult,
  DriveFolder,
  DriveFolderDiscoveryResult,
  DriveLibrarySnapshot,
  DriveSearchSnapshot,
} from './drive-discovery-models';
export { MY_DRIVE_ROOT_LOCATION, SHARED_FOLDERS_ROOT_LOCATION };

const searchFolderScopedAudioFiles = async (options: {
  accessToken: string;
  query: string;
  location: DriveBrowseLocation;
  parentFolderIds: string[];
  supportedMimeTypes: string[];
  supportedExtensions: string[];
  onProgress?: DriveSearchProgressCallback;
  signal?: AbortSignal;
}) => {
  const resolvedParentFolderIds =
    options.parentFolderIds.length > 0
      ? options.parentFolderIds
      : [options.location.id];
  const progressiveSearch = createProgressiveDriveSearch(options);

  for (const batch of splitIntoBatches(
    resolvedParentFolderIds,
    FOLDER_AUDIO_SEARCH_BATCH_SIZE,
  )) {
    const files = await requestAllDriveFilesWithFallback({
      accessToken: options.accessToken,
      query: createDriveSearchQuery(options.query, options.location, batch),
      includeSharedDrives: true,
      onPage: ({ files: pageFiles }) => {
        return progressiveSearch.addFiles(pageFiles);
      },
      signal: options.signal,
    });

    await progressiveSearch.addFiles(files);
  }

  return progressiveSearch.getSnapshot();
};

const listDescendantFolderIds = async (options: {
  accessToken: string;
  rootFolderId: string;
  signal?: AbortSignal;
}) => {
  const discoveredFolderIds = new Set<string>([options.rootFolderId]);
  let frontier = [options.rootFolderId];

  while (frontier.length > 0) {
    const nextFrontier: string[] = [];

    for (const batch of splitIntoBatches(frontier, FOLDER_SCOPE_BATCH_SIZE)) {
      const files = await requestAllDriveFilesWithFallback({
        accessToken: options.accessToken,
        query: createFolderDescendantQuery(batch),
        includeSharedDrives: true,
        signal: options.signal,
      });

      for (const file of files) {
        if (!isDriveFolder(file) || discoveredFolderIds.has(file.id)) {
          continue;
        }

        discoveredFolderIds.add(file.id);
        nextFrontier.push(file.id);
      }
    }

    frontier = nextFrontier;
  }

  return [...discoveredFolderIds];
};

export const listDriveLibrary = async (options: {
  accessToken: string;
  supportedMimeTypes: string[];
  supportedExtensions: string[];
  signal?: AbortSignal;
}) => {
  const response = await requestDriveFilesWithFallback({
    accessToken: options.accessToken,
    query: DRIVE_LIBRARY_QUERY,
    includeSharedDrives: true,
    signal: options.signal,
  });

  return parseDriveLibrarySnapshot(
    response,
    options.supportedMimeTypes,
    options.supportedExtensions,
  );
};

export const getDriveAudioSource = async (options: {
  accessToken: string;
  driveFileId: string;
  supportedMimeTypes: string[];
  supportedExtensions: string[];
  signal?: AbortSignal;
}) => {
  const response = await requestDriveFileMetadataWithFallback({
    accessToken: options.accessToken,
    driveFileId: options.driveFileId,
    signal: options.signal,
  });
  const file = (await response.json()) as DriveFileMetadata;

  return mapDriveFileToAudioSource(
    file,
    options.supportedMimeTypes,
    options.supportedExtensions,
  );
};

export const browseDriveLocation = async (options: {
  accessToken: string;
  location: DriveBrowseLocation;
  supportedMimeTypes: string[];
  supportedExtensions: string[];
  signal?: AbortSignal;
}) => {
  const files = await requestAllDriveFilesWithFallback({
    accessToken: options.accessToken,
    query: createBrowseQuery(options.location),
    includeSharedDrives: true,
    signal: options.signal,
  });
  const resolvedPaths = await resolveDriveFilePaths({
    accessToken: options.accessToken,
    files,
    signal: options.signal,
  });

  return parseDriveBrowseSnapshot(files, {
    location: options.location,
    resolvedPaths,
    supportedMimeTypes: options.supportedMimeTypes,
    supportedExtensions: options.supportedExtensions,
  });
};

export const searchDriveAudioFiles = async (options: {
  accessToken: string;
  query: string;
  location?: DriveBrowseLocation;
  onProgress?: DriveSearchProgressCallback;
  supportedMimeTypes: string[];
  supportedExtensions: string[];
  signal?: AbortSignal;
}) => {
  const trimmedQuery = options.query.trim();

  if (!trimmedQuery) {
    return createEmptyDriveSearchSnapshot('');
  }

  if (options.location?.kind === 'folder') {
    const rootFolderId = options.location.id;
    const parentFolderIds = await listDescendantFolderIds({
      accessToken: options.accessToken,
      rootFolderId,
      signal: options.signal,
    }).catch(() => {
      // Fall back to direct-folder scope if descendant discovery is unavailable.
      return [rootFolderId];
    });

    return searchFolderScopedAudioFiles({
      accessToken: options.accessToken,
      query: trimmedQuery,
      location: options.location,
      parentFolderIds,
      onProgress: options.onProgress,
      supportedMimeTypes: options.supportedMimeTypes,
      supportedExtensions: options.supportedExtensions,
      signal: options.signal,
    });
  }

  const progressiveSearch = createProgressiveDriveSearch({
    ...options,
    query: trimmedQuery,
  });
  await requestAllDriveFilesWithFallback({
    accessToken: options.accessToken,
    query: createDriveSearchQuery(trimmedQuery, options.location),
    includeSharedDrives: true,
    onPage: ({ files }) => {
      return progressiveSearch.addFiles(files);
    },
    signal: options.signal,
  });

  return progressiveSearch.getSnapshot();
};
