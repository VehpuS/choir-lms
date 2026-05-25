import type { NamedLoop } from '@org/audio-library-models';
import type { DriveAuthorizationState } from '@org/google-drive';
import { keyBy } from 'es-toolkit/compat';

import type {
  DriveLibrarySource,
  DriveLibraryStatusCopy,
} from './drive-library-view-model';
import type { SavedRehearsalLibraryIssue } from '../hooks/use-saved-rehearsal-library';

type SavedRehearsalLibraryStatusOptions = {
  authState: DriveAuthorizationState;
  isLoading: boolean;
  issue: SavedRehearsalLibraryIssue | null;
  savedSources: DriveLibrarySource[];
};

type ResolveSavedRehearsalLibrarySourcesOptions = {
  authState: DriveAuthorizationState;
  savedSources: DriveLibrarySource[];
  visibleSources: DriveLibrarySource[];
};

const CONNECT_SAVED_TRACK_MESSAGE =
  'Connect Google Drive to verify or play this saved rehearsal track.';
const RECONNECT_SAVED_TRACK_MESSAGE =
  'Reconnect Google Drive to restore this saved rehearsal track.';

export type SavedRehearsalLibraryRemovalCopy = {
  confirmLabel: string;
  message: string;
  title: string;
};

const pluralize = (count: number, noun: string) => {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
};

const formatAttentionCount = (count: number) => {
  if (count === 1) {
    return '1 item needs attention';
  }

  return `${count} items need attention`;
};

const markSavedSourceUnavailable = (
  source: DriveLibrarySource,
  reason: 'authorization-required' | 'access-revoked',
  message: string,
): DriveLibrarySource => {
  return {
    ...source,
    availability: {
      status: 'unavailable',
      reason,
      message,
    },
  };
};

const formatLoopRemovalList = (loops: Array<Pick<NamedLoop, 'name'>>) => {
  return loops
    .map((loop) => {
      return `• ${loop.name}`;
    })
    .join('\n');
};

export const getSavedRehearsalLibraryDependentLoops = (
  loops: Array<Pick<NamedLoop, 'id' | 'name' | 'sourceId'>>,
  sourceId: string,
) => {
  return loops.filter((loop) => {
    return loop.sourceId === sourceId;
  });
};

export const getSavedRehearsalLibraryRemovalCopy = (options: {
  dependentLoops: Array<Pick<NamedLoop, 'name'>>;
  source: Pick<DriveLibrarySource, 'name'>;
}): SavedRehearsalLibraryRemovalCopy => {
  if (options.dependentLoops.length === 0) {
    return {
      confirmLabel: 'Remove track',
      message: `"${options.source.name}" will be removed from your saved rehearsal library.`,
      title: 'Remove saved track?',
    };
  }

  return {
    confirmLabel: 'Remove track and loops',
    message:
      `"${options.source.name}" will be removed from your saved rehearsal library.\n\n` +
      `This will also remove ${pluralize(options.dependentLoops.length, 'saved loop')}:\n` +
      formatLoopRemovalList(options.dependentLoops),
    title: 'Remove saved track and loops?',
  };
};

export const resolveSavedRehearsalLibrarySources = (
  options: ResolveSavedRehearsalLibrarySourcesOptions,
) => {
  if (options.authState.status === 'expired') {
    return options.savedSources.map((source) => {
      return markSavedSourceUnavailable(
        source,
        'authorization-required',
        RECONNECT_SAVED_TRACK_MESSAGE,
      );
    });
  }

  if (options.authState.status !== 'authorized') {
    return options.savedSources.map((source) => {
      return markSavedSourceUnavailable(
        source,
        'access-revoked',
        CONNECT_SAVED_TRACK_MESSAGE,
      );
    });
  }

  const visibleSourcesById: Partial<Record<string, DriveLibrarySource>> = keyBy(
    options.visibleSources,
    (source) => source.id,
  );

  return options.savedSources.map((source) => {
    return visibleSourcesById[source.id] ?? source;
  });
};

export const getSavedRehearsalLibraryStatusCopy = (
  options: SavedRehearsalLibraryStatusOptions,
): DriveLibraryStatusCopy => {
  const savedSourceCount = options.savedSources.length;
  const unavailableSourceCount = options.savedSources.filter((source) => {
    return source.availability.status !== 'available';
  }).length;
  const availableSourceCount = savedSourceCount - unavailableSourceCount;

  if (options.issue?.kind === 'storage') {
    return {
      title: options.issue.title,
      message: options.issue.message,
      tone: 'error',
    };
  }

  if (options.isLoading && savedSourceCount === 0) {
    return {
      title: 'Loading saved library',
      message: 'Reading saved rehearsal tracks stored on this device.',
      tone: 'neutral',
    };
  }

  if (savedSourceCount === 0) {
    return {
      title: 'No saved tracks yet',
      message:
        'Save a playable Google Drive track to build a focused rehearsal library for playback, loops, and playlists.',
      tone: 'neutral',
    };
  }

  if (options.authState.status !== 'authorized') {
    return {
      title: 'Saved tracks need Drive access',
      message: `${pluralize(savedSourceCount, 'saved track')} remain visible in the rehearsal library, but reconnect Google Drive before playback, loops, or playlists can use them.`,
      tone: 'warning',
    };
  }

  if (unavailableSourceCount === 0) {
    return {
      title: 'Saved rehearsal library ready',
      message: `${pluralize(savedSourceCount, 'saved track')} available for playback, loops, and playlists.`,
      tone: 'ready',
    };
  }

  if (availableSourceCount === 0) {
    return {
      title: 'Saved rehearsal library needs attention',
      message: `${formatAttentionCount(unavailableSourceCount)} remain saved but are currently unavailable.`,
      tone: 'warning',
    };
  }

  return {
    title: 'Saved rehearsal library ready',
    message: `${pluralize(availableSourceCount, 'saved track')} available, plus ${formatAttentionCount(unavailableSourceCount)}.`,
    tone: 'warning',
  };
};

export const getSavedRehearsalLibrarySourceIssue = (
  issue: SavedRehearsalLibraryIssue | null,
  source: DriveLibrarySource,
  kind: 'remove' | 'save',
) => {
  if (issue?.kind !== kind) {
    return undefined;
  }

  if (issue.sourceId !== source.id) {
    return undefined;
  }

  return issue.message;
};
