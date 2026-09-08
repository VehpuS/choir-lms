import type {
  DriveAudioSource,
  DriveSourceLocation,
} from '@org/audio-library-models';

export type OriginalDriveLocationViewModel = {
  canOpenInGoogleDrive: boolean;
  canShowInAdd: boolean;
  pathLabel: string;
};

const ROOT_LABELS: Record<DriveSourceLocation['rootKind'], string> = {
  'my-drive': 'My Drive',
  shared: 'Shared with you',
};

const UNAVAILABLE_PATH_LABEL = 'Original Drive location unavailable';

export const getOriginalDriveLocationViewModel = (
  source: Pick<DriveAudioSource, 'sourceLocation'>,
): OriginalDriveLocationViewModel => {
  const sourceLocation = source.sourceLocation;

  if (!sourceLocation) {
    return {
      canOpenInGoogleDrive: false,
      canShowInAdd: false,
      pathLabel: UNAVAILABLE_PATH_LABEL,
    };
  }

  return {
    canOpenInGoogleDrive: true,
    canShowInAdd: true,
    pathLabel: [
      ROOT_LABELS[sourceLocation.rootKind],
      ...sourceLocation.path.map(({ name }) => name),
    ].join(' / '),
  };
};
