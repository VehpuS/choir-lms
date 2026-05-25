import {
  createDriveAudioSource,
  updateSourceAvailability,
  type DriveAudioSource,
  type SourceAvailabilityReason,
} from '@org/audio-library-models';

export type DriveAuthorizationStatus =
  | 'unconfigured'
  | 'authorized'
  | 'expired'
  | 'attention-required';

export type DriveAuthorizationState = {
  status: DriveAuthorizationStatus;
  accessToken?: string;
  scope: string;
  expiresAt?: string;
  error?: string;
};

export type DriveFileMetadata = {
  id: string;
  name: string;
  mimeType: string;
  fileExtension?: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
  shared?: boolean;
  audioMediaMetadata?: {
    durationMillis?: string;
  };
};

const toNumber = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isNaN(parsedValue) ? undefined : parsedValue;
};

const isSupportedFile = (
  file: DriveFileMetadata,
  supportedMimeTypes: string[],
  supportedExtensions: string[],
) => {
  const normalizedExtension = file.fileExtension?.toLowerCase();

  return (
    supportedMimeTypes.includes(file.mimeType.toLowerCase()) ||
    (normalizedExtension !== undefined &&
      supportedExtensions.includes(normalizedExtension))
  );
};

const resolveAvailabilityReason = (
  error: unknown,
): SourceAvailabilityReason => {
  if (error instanceof Error) {
    if (error.message.includes('401')) {
      return 'authorization-required';
    }

    if (error.message.includes('403')) {
      return 'access-revoked';
    }

    if (error.message.includes('404')) {
      return 'missing';
    }
  }

  return 'unknown';
};

export const buildDriveMediaUrl = (driveFileId: string) => {
  return `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media&supportsAllDrives=true`;
};

export const getDriveAuthorizationState = (
  session: Omit<DriveAuthorizationState, 'status'> & {
    status?: DriveAuthorizationStatus;
  },
  now: Date = new Date(),
): DriveAuthorizationState => {
  if (!session.accessToken) {
    return {
      ...session,
      status: 'unconfigured',
    };
  }

  if (session.error) {
    return {
      ...session,
      status: 'attention-required',
    };
  }

  if (session.expiresAt && new Date(session.expiresAt) <= now) {
    return {
      ...session,
      status: 'expired',
    };
  }

  return {
    ...session,
    status: 'authorized',
  };
};

export const mapDriveFileToAudioSource = (
  file: DriveFileMetadata,
  supportedMimeTypes: string[],
  supportedExtensions: string[],
): DriveAudioSource => {
  const supported = isSupportedFile(
    file,
    supportedMimeTypes,
    supportedExtensions,
  );

  return createDriveAudioSource({
    driveFileId: file.id,
    name: file.name,
    mimeType: file.mimeType,
    extension: file.fileExtension?.toLowerCase(),
    durationMs: toNumber(file.audioMediaMetadata?.durationMillis),
    sizeBytes: toNumber(file.size),
    modifiedTime: file.modifiedTime,
    webViewLink: file.webViewLink,
    iconLink: file.iconLink,
    availability: supported
      ? {
          status: 'available',
        }
      : {
          status: 'unsupported',
          reason: 'unsupported-format',
          message: 'This Drive file format is outside the MVP audio set.',
        },
  });
};

export const markSourceUnavailable = (
  source: DriveAudioSource,
  reason: SourceAvailabilityReason,
  message: string,
) => {
  return updateSourceAvailability(source, {
    status: 'unavailable',
    reason,
    message,
  });
};

export const handleDriveSourceError = (
  source: DriveAudioSource,
  error: unknown,
) => {
  const reason = resolveAvailabilityReason(error);

  return markSourceUnavailable(
    source,
    reason,
    error instanceof Error
      ? error.message
      : 'Drive access failed unexpectedly.',
  );
};
