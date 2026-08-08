import type {
  DriveBrowseLocation,
  DriveDiscoveredAudioSource,
  DriveFolder,
} from '@org/google-drive';
import { compact } from 'es-toolkit/compat';

export type SearchContextCopy = {
  helper: string;
  placeholder: string;
};

type DriveMetadataOptions = {
  includeUpdatedDate?: boolean;
};

const formatDurationSegment = (value: number) => {
  return value.toString().padStart(2, '0');
};

const formatUpdatedLabel = (modifiedTime?: string) => {
  if (!modifiedTime) {
    return undefined;
  }

  const parsedDate = new Date(modifiedTime);

  if (Number.isNaN(parsedDate.valueOf())) {
    return undefined;
  }

  return `Updated ${parsedDate.toISOString().slice(0, 10)}`;
};

const formatFormatLabel = (source: DriveDiscoveredAudioSource) => {
  if (source.extension) {
    const normalizedExtension = source.extension.toLowerCase();

    if (source.name.toLowerCase().endsWith(`.${normalizedExtension}`)) {
      return undefined;
    }

    return source.extension.toUpperCase();
  }

  return source.mimeType;
};

export const formatDurationLabel = (durationMs?: number) => {
  if (
    durationMs === undefined ||
    !Number.isFinite(durationMs) ||
    durationMs < 0
  ) {
    return undefined;
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${formatDurationSegment(minutes)}:${formatDurationSegment(seconds)}`;
  }

  return `${minutes}:${formatDurationSegment(seconds)}`;
};

export const getDriveSearchContextCopy = (
  location: DriveBrowseLocation,
): SearchContextCopy => {
  if (location.kind === 'folder') {
    return {
      helper: `Search in ${location.name}`,
      placeholder: `Search in ${location.name}`,
    };
  }

  if (location.rootKind === 'shared') {
    return {
      helper: 'Search in Shared folders',
      placeholder: 'Search in Shared folders',
    };
  }

  return {
    helper: 'Search in My Drive',
    placeholder: 'Search in My Drive',
  };
};

export const getLibrarySearchContextCopy = (): SearchContextCopy => {
  return {
    helper: 'Search saved library (playlists, tracks, and loops)',
    placeholder: 'Search saved library',
  };
};

export const getFolderMetadataLabels = (
  folder: DriveFolder,
  options: DriveMetadataOptions = {},
) => {
  const labels = compact([
    folder.shared || folder.rootKind === 'shared' ? 'Shared folder' : undefined,
    options.includeUpdatedDate
      ? formatUpdatedLabel(folder.modifiedTime)
      : undefined,
  ]);

  return labels;
};

export const getSourceAvailabilityLabel = (
  source: DriveDiscoveredAudioSource,
) => {
  if (source.availability.status === 'available') {
    return 'Playable';
  }

  if (
    source.availability.status === 'unsupported' &&
    source.availability.reason === 'unsupported-format'
  ) {
    return 'Unsupported format';
  }

  if (source.availability.status === 'unsupported') {
    return 'Unsupported';
  }

  return 'Unavailable';
};

export const getSourceMetadataLabels = (
  source: DriveDiscoveredAudioSource,
  options: DriveMetadataOptions = {},
) => {
  const labels = compact([
    formatFormatLabel(source),
    formatDurationLabel(source.durationMs),
    options.includeUpdatedDate
      ? formatUpdatedLabel(source.modifiedTime)
      : undefined,
    source.locationLabel,
  ]);

  if (labels.length > 0) {
    return labels;
  }

  return [];
};

export const getSourceStatusMessage = (source: DriveDiscoveredAudioSource) => {
  if (source.availability.status === 'available') {
    return undefined;
  }

  if (source.availability.message) {
    return source.availability.message;
  }

  if (source.availability.status === 'unsupported') {
    return 'This source is outside the supported audio set.';
  }

  return 'This source is currently unavailable.';
};
