import type {
  DriveAuthorizationState,
  DriveLibrarySnapshot,
} from '@org/google-drive';
import { compact } from 'es-toolkit/compat';

export type DriveLibrarySource =
  | DriveLibrarySnapshot['playableSources'][number]
  | DriveLibrarySnapshot['unavailableSources'][number];

export type DriveLibraryStatusTone = 'neutral' | 'warning' | 'error' | 'ready';

export type DriveLibraryStatusCopy = {
  title: string;
  message: string;
  tone: DriveLibraryStatusTone;
};

type DriveLibraryStatusOptions = {
  authState: DriveAuthorizationState;
  googleAuthConfigured: boolean;
  isLoading: boolean;
  issue: string | null;
  snapshot: DriveLibrarySnapshot;
};

const AUTH_FAILURE_PATTERN = /\b(401|403)\b/;
const NETWORK_FAILURE_PATTERN = /network/i;
const DETAILED_DRIVE_FAILURE_PATTERN =
  /^Drive library request failed with \d{3}:\s*(.+)$/;

const pluralize = (count: number, noun: string) => {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
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

const formatFormatLabel = (source: DriveLibrarySource) => {
  if (source.extension) {
    return source.extension.toUpperCase();
  }

  return source.mimeType;
};

const getTotalSourceCount = (snapshot: DriveLibrarySnapshot) => {
  return snapshot.playableSources.length + snapshot.unavailableSources.length;
};

const normalizeIssueMessage = (issue: string) => {
  const detailedDriveFailure = issue.match(DETAILED_DRIVE_FAILURE_PATTERN)?.[1];

  if (detailedDriveFailure) {
    return detailedDriveFailure;
  }

  if (AUTH_FAILURE_PATTERN.test(issue)) {
    return 'Drive access needs attention before the rehearsal library can refresh.';
  }

  if (NETWORK_FAILURE_PATTERN.test(issue)) {
    return 'Drive audio could not be loaded because the network request failed.';
  }

  return 'Drive audio could not be loaded right now. Retry after checking the Google connection and network state.';
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

export const getDriveLibraryStatusCopy = (
  options: DriveLibraryStatusOptions,
): DriveLibraryStatusCopy => {
  const playableCount = options.snapshot.playableSources.length;
  const unavailableCount = options.snapshot.unavailableSources.length;
  const totalSourceCount = getTotalSourceCount(options.snapshot);

  if (!options.googleAuthConfigured) {
    return {
      title: 'Google Drive credentials missing',
      message:
        'Add the mobile Google client IDs before the rehearsal library can load Drive audio.',
      tone: 'warning',
    };
  }

  if (options.authState.status === 'expired') {
    return {
      title: 'Drive access expired',
      message:
        'Reconnect Google Drive to reload the rehearsal library and review available audio files.',
      tone: 'warning',
    };
  }

  if (options.authState.status === 'attention-required') {
    return {
      title: 'Drive access needs attention',
      message:
        'Resolve the Google Drive authorization issue before using the rehearsal library.',
      tone: 'error',
    };
  }

  if (options.authState.status !== 'authorized') {
    return {
      title: 'Connect Google Drive',
      message:
        'Authorize Google Drive to browse supported rehearsal audio in the mobile library.',
      tone: 'neutral',
    };
  }

  if (options.issue) {
    return {
      title: 'Library refresh failed',
      message: normalizeIssueMessage(options.issue),
      tone: 'error',
    };
  }

  if (options.isLoading && totalSourceCount === 0) {
    return {
      title: 'Loading rehearsal library',
      message:
        'Checking Google Drive for supported audio files and any items that need attention.',
      tone: 'neutral',
    };
  }

  if (playableCount === 0 && unavailableCount === 0) {
    return {
      title: 'No rehearsal audio found',
      message:
        'No supported Google Drive audio files are currently available to this rehearsal library.',
      tone: 'neutral',
    };
  }

  if (playableCount === 0) {
    return {
      title: 'No playable tracks yet',
      message: `${pluralize(unavailableCount, 'file')} need attention before playback. Review the unavailable and unsupported items below.`,
      tone: 'warning',
    };
  }

  if (unavailableCount === 0) {
    return {
      title: 'Library ready',
      message: `${pluralize(playableCount, 'playable track')} are available in the rehearsal library.`,
      tone: 'ready',
    };
  }

  return {
    title: 'Library ready',
    message: `${pluralize(playableCount, 'playable track')} found, plus ${pluralize(unavailableCount, 'item')} that need attention.`,
    tone: 'ready',
  };
};

export const getSourceAvailabilityLabel = (source: DriveLibrarySource) => {
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

export const getSourceMetadataLabels = (source: DriveLibrarySource) => {
  const labels = compact([
    formatFormatLabel(source),
    formatDurationLabel(source.durationMs),
    formatUpdatedLabel(source.modifiedTime),
  ]);

  if (labels.length > 0) {
    return labels;
  }

  return ['Metadata unavailable'];
};

export const getSourceStatusMessage = (source: DriveLibrarySource) => {
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
