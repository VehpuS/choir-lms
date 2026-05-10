import {
  createDriveAudioSource,
  updateSourceAvailability,
  type DriveAudioSource,
  type SourceAvailabilityReason,
} from '@org/rehearsal-domain';
import { map, partition } from 'es-toolkit/compat';

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
  audioMediaMetadata?: {
    durationMillis?: string;
  };
};

export type DriveLibrarySnapshot = {
  playableSources: DriveAudioSource[];
  unavailableSources: DriveAudioSource[];
};

const DEFAULT_FIELDS = [
  'files(id,name,mimeType,fileExtension,size,modifiedTime,webViewLink,iconLink,audioMediaMetadata/durationMillis)',
  'nextPageToken',
].join(',');

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
  return `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`;
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

export const listDriveLibrary = async (options: {
  accessToken: string;
  supportedMimeTypes: string[];
  supportedExtensions: string[];
  signal?: AbortSignal;
}) => {
  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?' +
      new URLSearchParams({
        q: "trashed = false and mimeType contains 'audio/'",
        fields: DEFAULT_FIELDS,
        pageSize: '100',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
        corpora: 'user',
      }),
    {
      method: 'GET',
      signal: options.signal,
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Drive library request failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    files?: DriveFileMetadata[];
  };
  const sources = map(payload.files ?? [], (file) => {
    return mapDriveFileToAudioSource(
      file,
      options.supportedMimeTypes,
      options.supportedExtensions,
    );
  });
  const [playableSources, unavailableSources] = partition(
    sources,
    (source) => source.availability.status === 'available',
  );

  return {
    playableSources,
    unavailableSources,
  } satisfies DriveLibrarySnapshot;
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
