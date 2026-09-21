import type { SourceAvailabilityReason } from '@org/audio-library-models';

import type { DriveBrowseRootKind } from './drive-discovery-models';
import { requestDriveFileMetadataWithFallback } from './drive-files-client';
import {
  resolveDriveFilePaths,
  type DrivePathSegment,
} from './drive-path-resolver';
import {
  resolveAvailabilityReason,
  type DriveFileMetadata,
} from './google-drive-core';

export type DriveCurrentSourceLocationUnresolvedReason =
  | SourceAvailabilityReason
  | 'no-accessible-parent';

export type DriveCurrentSourceLocation = {
  rootKind: DriveBrowseRootKind;
  parentFolderId: string;
  parentFolderName: string;
  path: DrivePathSegment[];
};

export type DriveCurrentSourceLocationResult =
  | { status: 'resolved'; location: DriveCurrentSourceLocation }
  | {
      status: 'unresolved';
      reason: DriveCurrentSourceLocationUnresolvedReason;
    };

const isAbortError = (error: unknown) => {
  return error instanceof Error && error.name === 'AbortError';
};

/**
 * Resolves a saved Drive file's current accessible parent folder and path by
 * stable Drive file id, rather than trusting previously stored provenance.
 */
export const resolveCurrentDriveSourceLocation = async (options: {
  accessToken: string;
  driveFileId: string;
  signal?: AbortSignal;
}): Promise<DriveCurrentSourceLocationResult> => {
  let metadata: DriveFileMetadata;

  try {
    const response = await requestDriveFileMetadataWithFallback({
      accessToken: options.accessToken,
      driveFileId: options.driveFileId,
      signal: options.signal,
    });

    metadata = (await response.json()) as DriveFileMetadata;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    return { status: 'unresolved', reason: resolveAvailabilityReason(error) };
  }

  try {
    const resolvedPaths = await resolveDriveFilePaths({
      accessToken: options.accessToken,
      files: [metadata],
      signal: options.signal,
    });
    const resolvedPath = resolvedPaths.get(metadata.id);
    const parentSegment = resolvedPath?.path[resolvedPath.path.length - 1];

    if (!resolvedPath || !parentSegment) {
      return { status: 'unresolved', reason: 'no-accessible-parent' };
    }

    return {
      status: 'resolved',
      location: {
        rootKind: resolvedPath.rootKind,
        parentFolderId: parentSegment.id,
        parentFolderName: parentSegment.name,
        path: resolvedPath.path,
      },
    };
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    return { status: 'unresolved', reason: 'unknown' };
  }
};
