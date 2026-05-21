import type {
  DriveAuthorizationState,
  DriveBrowseSnapshot,
  DriveDiscoveredAudioSource,
  DriveFolder,
  DriveSearchSnapshot,
} from '@org/google-drive';
import { compact } from 'es-toolkit/compat';

export type DriveLibrarySource = DriveDiscoveredAudioSource;

export type DriveLibraryFolder = DriveFolder;

export type DriveLibraryStatusTone = 'neutral' | 'warning' | 'error' | 'ready';

export type DriveLibraryStatusCopy = {
  title: string;
  message: string;
  tone: DriveLibraryStatusTone;
};

type DriveLibraryStatusOptions = {
  authState: DriveAuthorizationState;
  activeSearchQuery: string | null;
  browseSnapshot: DriveBrowseSnapshot;
  googleAuthConfigured: boolean;
  isLoading: boolean;
  issue: string | null;
  searchSnapshot: DriveSearchSnapshot;
};

const AUTH_FAILURE_PATTERN = /\b(401|403)\b/;
const NETWORK_FAILURE_PATTERN = /network/i;
const DETAILED_DRIVE_FAILURE_PATTERN =
  /^Drive library request failed with \d{3}:\s*(.+)$/;

const pluralize = (count: number, noun: string) => {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
};

const formatAttentionCount = (count: number) => {
  if (count === 1) {
    return '1 item needs attention';
  }

  return `${count} items need attention`;
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

const getTotalBrowseSourceCount = (snapshot: DriveBrowseSnapshot) => {
  return snapshot.playableSources.length + snapshot.unavailableSources.length;
};

const getTotalSearchSourceCount = (snapshot: DriveSearchSnapshot) => {
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
  const browseFolderCount = options.browseSnapshot.folders.length;
  const browsePlayableCount = options.browseSnapshot.playableSources.length;
  const browseUnavailableCount =
    options.browseSnapshot.unavailableSources.length;
  const browseTotalSourceCount = getTotalBrowseSourceCount(
    options.browseSnapshot,
  );
  const searchPlayableCount = options.searchSnapshot.playableSources.length;
  const searchUnavailableCount =
    options.searchSnapshot.unavailableSources.length;
  const searchTotalSourceCount = getTotalSearchSourceCount(
    options.searchSnapshot,
  );

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
      title: 'Drive discovery failed',
      message: normalizeIssueMessage(options.issue),
      tone: 'error',
    };
  }

  if (options.activeSearchQuery) {
    if (options.isLoading && searchTotalSourceCount === 0) {
      return {
        title: 'Searching Google Drive',
        message:
          'Looking for matching audio across My Drive and shared folders.',
        tone: 'neutral',
      };
    }

    if (searchPlayableCount === 0 && searchUnavailableCount === 0) {
      return {
        title: 'No search results',
        message: `No supported audio matched "${options.activeSearchQuery}". Try another track name or return to folder browsing.`,
        tone: 'neutral',
      };
    }

    if (searchPlayableCount === 0) {
      return {
        title: 'No playable matches',
        message: `${formatAttentionCount(searchUnavailableCount)} matched "${options.activeSearchQuery}" but are not currently playable.`,
        tone: 'warning',
      };
    }

    if (searchUnavailableCount === 0) {
      return {
        title: 'Search results ready',
        message: `${pluralize(searchPlayableCount, 'matching track')} found across My Drive and shared folders.`,
        tone: 'ready',
      };
    }

    return {
      title: 'Search results ready',
      message: `${pluralize(searchPlayableCount, 'matching track')} found, plus ${formatAttentionCount(searchUnavailableCount)}.`,
      tone: 'ready',
    };
  }

  if (options.isLoading && browseFolderCount + browseTotalSourceCount === 0) {
    return {
      title: 'Loading Drive browser',
      message: `Checking folders and audio in ${options.browseSnapshot.location.name}.`,
      tone: 'neutral',
    };
  }

  if (browseFolderCount === 0 && browsePlayableCount === 0 && browseUnavailableCount === 0) {
    return {
      title: 'Nothing here yet',
      message: `No folders or supported audio are currently available in ${options.browseSnapshot.location.name}.`,
      tone: 'neutral',
    };
  }

  if (browsePlayableCount === 0 && browseUnavailableCount > 0) {
    return {
      title: 'No playable tracks here',
      message: `Review ${formatAttentionCount(browseUnavailableCount)} in ${options.browseSnapshot.location.name} before saving or playback.`,
      tone: 'warning',
    };
  }

  if (browseUnavailableCount === 0) {
    return {
      title: 'Drive browser ready',
      message: `${pluralize(browseFolderCount, 'folder')} and ${pluralize(browsePlayableCount, 'playable track')} are available in ${options.browseSnapshot.location.name}.`,
      tone: 'ready',
    };
  }

  return {
    title: 'Drive browser ready',
    message: `${pluralize(browseFolderCount, 'folder')}, ${pluralize(browsePlayableCount, 'playable track')}, and ${formatAttentionCount(browseUnavailableCount)} are available in ${options.browseSnapshot.location.name}.`,
    tone: 'ready',
  };
};

export const getFolderMetadataLabels = (folder: DriveLibraryFolder) => {
  const labels = compact([
    folder.shared || folder.rootKind === 'shared' ? 'Shared folder' : 'Folder',
    formatUpdatedLabel(folder.modifiedTime),
  ]);

  if (labels.length > 0) {
    return labels;
  }

  return ['Folder'];
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
    source.locationLabel,
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
