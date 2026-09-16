import {
  createEmptyDriveSearchSnapshot,
  parseDriveSearchSnapshot,
  type DriveBrowseLocation,
} from './drive-discovery-models';
import { splitIntoBatches } from './drive-file-queries';
import {
  createDrivePathResolutionCache,
  resolveDriveFilePaths,
  type DriveResolvedPath,
} from './drive-path-resolver';
import type { DriveFileMetadata } from './google-drive-core';

const SEARCH_PRESENTATION_BATCH_SIZE = 12;

export type DriveSearchProgressCallback = (
  snapshot: ReturnType<typeof parseDriveSearchSnapshot>,
) => Promise<void> | void;

export const createProgressiveDriveSearch = (options: {
  accessToken: string;
  location?: DriveBrowseLocation;
  onProgress?: DriveSearchProgressCallback;
  query: string;
  signal?: AbortSignal;
  supportedMimeTypes: string[];
  supportedExtensions: string[];
}) => {
  const filesById = new Map<string, DriveFileMetadata>();
  const pathCache = createDrivePathResolutionCache();
  const resolvedPaths = new Map<string, DriveResolvedPath>();
  const seenFileIds = new Set<string>();
  let snapshot = createEmptyDriveSearchSnapshot(options.query);

  return {
    addFiles: async (files: DriveFileMetadata[]) => {
      const newFiles = files.filter((file) => {
        if (seenFileIds.has(file.id)) {
          return false;
        }

        seenFileIds.add(file.id);
        return true;
      });

      if (newFiles.length === 0) {
        return;
      }

      for (const batch of splitIntoBatches(
        newFiles,
        SEARCH_PRESENTATION_BATCH_SIZE,
      )) {
        const batchPaths = await resolveDriveFilePaths({
          accessToken: options.accessToken,
          cache: pathCache,
          files: batch,
          signal: options.signal,
        });

        for (const file of batch) {
          filesById.set(file.id, file);
        }

        for (const [fileId, resolvedPath] of batchPaths) {
          resolvedPaths.set(fileId, resolvedPath);
        }

        snapshot = parseDriveSearchSnapshot([...filesById.values()], {
          query: options.query,
          location: options.location,
          resolvedPaths,
          supportedMimeTypes: options.supportedMimeTypes,
          supportedExtensions: options.supportedExtensions,
        });
        await options.onProgress?.(snapshot);
      }
    },
    getSnapshot: () => snapshot,
  };
};
