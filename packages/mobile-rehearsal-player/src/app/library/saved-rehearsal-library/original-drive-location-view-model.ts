import type { DriveAudioSource } from '@org/audio-library-models';

import { DRIVE_ROOT_LABELS } from '@org/google-drive';

export type OriginalDriveLocationViewModel = {
  canOpenInGoogleDrive: boolean;
  canShowInAdd: boolean;
  hasKnownPath: boolean;
  pathLabel: string;
};

const UNKNOWN_PATH_LABEL = 'Original Drive location not yet checked';

// Every saved source is a Drive file with a stable `driveFileId`, so its
// original location can always be resolved live (see the 8.2 resolver) even
// when no `sourceLocation` was persisted yet, such as for tracks saved
// before provenance tracking existed. A successful resolution backfills
// `sourceLocation` for next time.
export const getOriginalDriveLocationViewModel = (
  source: Pick<DriveAudioSource, 'sourceLocation'>,
): OriginalDriveLocationViewModel => {
  const sourceLocation = source.sourceLocation;

  if (!sourceLocation) {
    return {
      canOpenInGoogleDrive: true,
      canShowInAdd: true,
      hasKnownPath: false,
      pathLabel: UNKNOWN_PATH_LABEL,
    };
  }

  return {
    canOpenInGoogleDrive: true,
    canShowInAdd: true,
    hasKnownPath: true,
    pathLabel: [
      DRIVE_ROOT_LABELS[sourceLocation.rootKind],
      ...sourceLocation.path.map(({ name }) => name),
    ].join(' / '),
  };
};
