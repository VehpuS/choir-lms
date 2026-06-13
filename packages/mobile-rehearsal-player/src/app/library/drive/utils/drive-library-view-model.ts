import type {
  DriveAuthorizationState,
  DriveBrowseLocation,
  DriveBrowseSnapshot,
  DriveDiscoveredAudioSource,
  DriveFolder,
  DriveSearchSnapshot,
} from '@org/google-drive';

export {
  formatDurationLabel,
  getDriveSearchContextCopy,
  getFolderMetadataLabels,
  getLibrarySearchContextCopy,
  getSourceAvailabilityLabel,
  getSourceMetadataLabels,
  getSourceStatusMessage,
} from './drive-library-metadata';
export type { SearchContextCopy } from './drive-library-metadata';

import { getDriveSearchContextCopy } from './drive-library-metadata';

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
  currentSearchLocation?: DriveBrowseLocation;
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

const getTotalBrowseSourceCount = (snapshot: DriveBrowseSnapshot) => {
  return snapshot.playableSources.length + snapshot.unavailableSources.length;
};

const getTotalSearchSourceCount = (snapshot: DriveSearchSnapshot) => {
  return snapshot.playableSources.length + snapshot.unavailableSources.length;
};

const getDriveSearchScopeCopy = (location?: DriveBrowseLocation) => {
  if (!location) {
    return {
      loadingMessage:
        'Looking for matching audio across My Drive and shared folders.',
      readySuffix: 'across My Drive and shared folders',
    };
  }

  const searchContext = getDriveSearchContextCopy(location);

  if (location.kind === 'folder') {
    return {
      loadingMessage: `Looking for matching audio in ${location.name} and nested folders.`,
      readySuffix: `in ${location.name} and nested folders`,
    };
  }

  return {
    loadingMessage: `Looking for matching audio ${searchContext.helper.replace('Search ', '').toLowerCase()}.`,
    readySuffix: searchContext.helper.replace('Search ', '').toLowerCase(),
  };
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

export const getDriveLibraryStatusCopy = (
  options: DriveLibraryStatusOptions,
): DriveLibraryStatusCopy => {
  const searchScopeCopy = getDriveSearchScopeCopy(
    options.currentSearchLocation,
  );
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
        message: searchScopeCopy.loadingMessage,
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
        message: `${pluralize(searchPlayableCount, 'matching track')} found ${searchScopeCopy.readySuffix}.`,
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

  if (
    browseFolderCount === 0 &&
    browsePlayableCount === 0 &&
    browseUnavailableCount === 0
  ) {
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
