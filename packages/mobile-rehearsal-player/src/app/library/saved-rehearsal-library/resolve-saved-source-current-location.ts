import type { DriveSourceLocation } from '@org/audio-library-models';
import {
  resolveCurrentDriveSourceLocation,
  type DriveCurrentSourceLocationUnresolvedReason,
} from '@org/google-drive';

import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';

export type ResolveSavedSourceCurrentLocationResult =
  | { status: 'resolved'; hasMoved: boolean; location: DriveSourceLocation }
  | {
      status: 'unresolved';
      reason: DriveCurrentSourceLocationUnresolvedReason;
    };

const isSameDriveSourceLocation = (
  storedLocation: DriveSourceLocation | undefined,
  currentLocation: DriveSourceLocation,
) => {
  if (!storedLocation) {
    return false;
  }

  return (
    storedLocation.parentFolderId === currentLocation.parentFolderId &&
    storedLocation.rootKind === currentLocation.rootKind &&
    storedLocation.path.length === currentLocation.path.length &&
    storedLocation.path.every((segment, index) => {
      const currentSegment = currentLocation.path[index];

      return (
        currentSegment !== undefined &&
        segment.id === currentSegment.id &&
        segment.name === currentSegment.name
      );
    })
  );
};

/**
 * Resolves a saved Drive source's current parent folder by stable Drive file
 * id rather than trusting stored provenance, and persists the refreshed
 * location (preserving app-owned fields through the existing save path) when
 * it differs from what was last saved.
 */
export const resolveSavedSourceCurrentLocation = async (options: {
  accessToken: string;
  resolveCurrentLocation?: typeof resolveCurrentDriveSourceLocation;
  saveSource: (source: DriveLibrarySource) => Promise<boolean>;
  signal?: AbortSignal;
  source: DriveLibrarySource;
}): Promise<ResolveSavedSourceCurrentLocationResult> => {
  const resolveCurrentLocation =
    options.resolveCurrentLocation ?? resolveCurrentDriveSourceLocation;
  const result = await resolveCurrentLocation({
    accessToken: options.accessToken,
    driveFileId: options.source.driveFileId,
    signal: options.signal,
  });

  if (result.status === 'unresolved') {
    return result;
  }

  const hasMoved = !isSameDriveSourceLocation(
    options.source.sourceLocation,
    result.location,
  );

  if (hasMoved) {
    await options.saveSource({
      ...options.source,
      sourceLocation: result.location,
    });
  }

  return { status: 'resolved', hasMoved, location: result.location };
};
