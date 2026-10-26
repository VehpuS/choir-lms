import type { NamedLoop } from '@org/audio-library-models';
import type { DriveAuthorizationState } from '@org/google-drive';
import { pickBy } from 'es-toolkit';
import { keyBy } from 'es-toolkit/compat';

import type {
  DriveLibrarySource,
  DriveLibraryStatusCopy,
} from '../drive/utils/drive-library-view-model';
import type { SavedRehearsalLibraryIssue } from './use-saved-rehearsal-library';

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

// Fields the user owns on a saved track. Drive knows nothing about them, so a
// Drive row on screen must not erase them: add a new saved-only field here.
const SAVED_TRACK_OWNED_FIELDS = new Set<string>([
  'lyrics',
  'markers',
  'sheetMusic',
  'sourceLocation',
  'tagAddedAt',
  'tags',
]);

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

export const getSavedRehearsalLibraryDependentLoops = <
  Loop extends Pick<NamedLoop, 'id' | 'name' | 'sourceId'>,
>(
  loops: Loop[],
  sourceId: string,
) => {
  return loops.filter((loop) => {
    return loop.sourceId === sourceId;
  });
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
    const visibleSource = visibleSourcesById[source.id];

    if (!visibleSource) {
      return source;
    }

    const ownedFields = pickBy(source, (value, key) => {
      return value !== undefined && SAVED_TRACK_OWNED_FIELDS.has(key);
    });
    // Drive is the source of truth for the duration whenever it reports one;
    // the saved value only fills the gap before Drive has.
    const durationMs = visibleSource.durationMs ?? source.durationMs;

    return {
      ...visibleSource,
      ...(durationMs === undefined ? {} : { durationMs }),
      ...ownedFields,
    };
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

  // A failed `Keep offline` is shown here too, so it is seen from any view.
  if (options.issue?.kind === 'storage' || options.issue?.kind === 'offline') {
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
  kind: 'offline' | 'remove' | 'save',
) => {
  if (issue?.kind !== kind) {
    return undefined;
  }

  if (issue.sourceId !== source.id) {
    return undefined;
  }

  return issue.message;
};
