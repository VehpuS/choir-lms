import type {
  DriveDiscoveredAudioSource,
  DriveFolder,
} from '@org/google-drive';
import { compact } from 'es-toolkit/compat';

import { formatDurationLabel } from './drive-library-metadata';

// Browse-row meta lines for Add (screen 1e): audio rows read
// `MP3 · 8.4 MB · 4:38` and folder rows `Updated 3 Nov`. The location label
// is left out while browsing because it is the folder on screen. Search
// results keep their own labels (with the containing path) in
// `drive-library-metadata.ts`.

const BYTES_PER_UNIT = 1024;
const SIZE_UNITS = ['KB', 'MB', 'GB'] as const;
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;
const FILE_EXTENSION_PATTERN = /\.([a-z0-9]{1,5})$/i;

export const UNSUPPORTED_AUDIO_FORMAT_LABEL = 'Not a supported audio format';
const SHARED_FOLDER_LABEL = 'Shared folder';

/** `8.4 MB`: at most one decimal from megabytes up, whole kilobytes, plain bytes. */
export const formatDriveFileSizeLabel = (sizeBytes?: number) => {
  if (sizeBytes === undefined || !Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return undefined;
  }

  if (sizeBytes < BYTES_PER_UNIT) {
    return `${sizeBytes} B`;
  }

  let value = sizeBytes / BYTES_PER_UNIT;
  let unitIndex = 0;

  while (value >= BYTES_PER_UNIT && unitIndex < SIZE_UNITS.length - 1) {
    value /= BYTES_PER_UNIT;
    unitIndex += 1;
  }

  const roundedValue =
    unitIndex === 0 ? Math.round(value) : Number(value.toFixed(1));

  return `${roundedValue} ${SIZE_UNITS[unitIndex]}`;
};

/** The file's format as a short uppercase label, even when the name ends in it. */
export const formatDriveFileFormatLabel = (
  source: Pick<DriveDiscoveredAudioSource, 'extension' | 'name'>,
) => {
  const extension =
    source.extension ?? FILE_EXTENSION_PATTERN.exec(source.name)?.[1];

  return extension ? extension.toUpperCase() : undefined;
};

/** `Updated 3 Nov`, with the year when it is not the current one. */
export const formatDriveUpdatedLabel = (
  modifiedTime: string | undefined,
  now: Date,
) => {
  if (!modifiedTime) {
    return undefined;
  }

  const date = new Date(modifiedTime);

  if (Number.isNaN(date.valueOf())) {
    return undefined;
  }

  const dayMonth = `${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`;

  return date.getFullYear() === now.getFullYear()
    ? `Updated ${dayMonth}`
    : `Updated ${dayMonth} ${date.getFullYear()}`;
};

export const getBrowseSourceMetadataLabels = (
  source: DriveDiscoveredAudioSource,
): string[] => {
  if (source.availability.status !== 'available') {
    const isUnsupportedFormat =
      source.availability.status === 'unsupported' &&
      source.availability.reason === 'unsupported-format';

    return [
      isUnsupportedFormat
        ? UNSUPPORTED_AUDIO_FORMAT_LABEL
        : (source.availability.message ?? 'Unavailable'),
    ];
  }

  return compact([
    formatDriveFileFormatLabel(source),
    formatDriveFileSizeLabel(source.sizeBytes),
    formatDurationLabel(source.durationMs),
  ]);
};

export const getBrowseFolderMetadataLabels = (
  folder: DriveFolder,
  now: Date = new Date(),
): string[] => {
  return compact([
    formatDriveUpdatedLabel(folder.modifiedTime, now),
    folder.shared || folder.rootKind === 'shared'
      ? SHARED_FOLDER_LABEL
      : undefined,
  ]);
};
