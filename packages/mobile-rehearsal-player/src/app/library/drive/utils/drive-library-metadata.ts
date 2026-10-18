import {
  DRIVE_ROOT_LABELS,
  type DriveBrowseLocation,
  type DriveDiscoveredAudioSource,
  type DriveFolder,
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

const MS_PER_SECOND = 1000;
const MS_PER_TENTH_SECOND = 100;
const TENTHS_PER_SECOND = 10;

// A length (not a position): a clip shorter than a second would read `0:00`,
// which looks like an unreadable file, so it gets one decimal instead
// (`0:00.6`). Positions keep whole seconds, or early playback would flicker
// `0:00.4` before settling.
export const formatLengthLabel = (durationMs?: number) => {
  if (
    durationMs === undefined ||
    !Number.isFinite(durationMs) ||
    durationMs <= 0 ||
    durationMs >= MS_PER_SECOND
  ) {
    return formatDurationLabel(durationMs);
  }

  const tenths = Math.max(1, Math.round(durationMs / MS_PER_TENTH_SECOND));

  // Just under a second rounds up to the whole second.
  return tenths >= TENTHS_PER_SECOND ? '0:01' : `0:00.${tenths}`;
};

// The field's position under the root switcher implies its scope, so the
// visible placeholder stays short; `helper` is the screen-reader name that
// still says where it searches (design Decision 14).
const DRIVE_SEARCH_PLACEHOLDER = 'Search';

export const getDriveSearchContextCopy = (
  location: DriveBrowseLocation,
): SearchContextCopy => {
  if (location.kind === 'folder') {
    return {
      helper: `Search in ${location.name}`,
      placeholder: DRIVE_SEARCH_PLACEHOLDER,
    };
  }

  if (location.rootKind === 'shared') {
    return {
      helper: `Search in ${DRIVE_ROOT_LABELS.shared}`,
      placeholder: DRIVE_SEARCH_PLACEHOLDER,
    };
  }

  return {
    helper: `Search in ${DRIVE_ROOT_LABELS['my-drive']}`,
    placeholder: DRIVE_SEARCH_PLACEHOLDER,
  };
};

// Search is per view, so the placeholder names the view it searches instead of
// implying one box covers the whole library (task 8.87).
const LIBRARY_SEARCH_PLACEHOLDERS: Record<string, string> = {
  files: 'Search files',
  loops: 'Search loops',
  playlists: 'Search playlists',
  tags: 'Search tags',
  tracks: 'Search tracks',
};
const DEFAULT_LIBRARY_SEARCH_PLACEHOLDER = 'Search saved library';

export const getLibrarySearchContextCopy = (
  view?: string,
): { placeholder: string } => {
  return {
    placeholder:
      (view ? LIBRARY_SEARCH_PLACEHOLDERS[view] : undefined) ??
      DEFAULT_LIBRARY_SEARCH_PLACEHOLDER,
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
