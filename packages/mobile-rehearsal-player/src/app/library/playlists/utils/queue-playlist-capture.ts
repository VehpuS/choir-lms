import {
  addCompositeToPlaylist,
  addLoopToPlaylist,
  addTrackToPlaylist,
  type CompositeTrack,
  type NamedLoop,
  type Playlist,
} from '@org/audio-library-models';

import { getCompositesSnapshot } from '../../composite/store/composite-store-instance';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { PlaylistPlaybackSession } from './saved-playlist-playback-view-model';
import {
  buildSavedPlaylist,
  type PlaylistDraftIssue,
} from './saved-playlist-view-model';

const NO_QUEUE_CAPTURE_ISSUE: PlaylistDraftIssue = {
  title: 'Queue unavailable',
  message: 'Start a queue before saving it as a playlist.',
};

const createMissingLoopIssue = (loopTitle: string): PlaylistDraftIssue => {
  return {
    title: 'Queued loop unavailable',
    message: `The queue item "${loopTitle}" no longer has a saved loop source. Remove it from the queue before saving this playlist.`,
  };
};

const createMissingCompositeIssue = (title: string): PlaylistDraftIssue => {
  return {
    title: 'Queued composite unavailable',
    message: `The queue item "${title}" is no longer in your library. Remove it from the queue before saving this playlist.`,
  };
};

const getQueueEntryTimestamp = (baseTimestamp: string, itemIndex: number) => {
  const baseMs = Date.parse(baseTimestamp);
  const timestampMs = Number.isNaN(baseMs)
    ? Date.now() + itemIndex + 1
    : baseMs + itemIndex + 1;

  return new Date(timestampMs).toISOString();
};

const captureQueueItemsIntoPlaylist = (options: {
  baseTimestamp: string;
  composites: readonly CompositeTrack[];
  playlist: Playlist;
  savedLoops: NamedLoop[];
  savedSources: DriveLibrarySource[];
  session: PlaylistPlaybackSession | null;
}): {
  issue: PlaylistDraftIssue | null;
  playlist: Playlist | null;
  unsavedSources: DriveLibrarySource[];
} => {
  if (!options.session || options.session.queue.items.length === 0) {
    return {
      issue: NO_QUEUE_CAPTURE_ISSUE,
      playlist: null,
      unsavedSources: [],
    };
  }

  const savedSourceIds = new Set(
    options.savedSources.map((source) => {
      return source.id;
    }),
  );
  const trackedUnsavedSourceIds = new Set<string>();
  const unsavedSources: DriveLibrarySource[] = [];
  let playlist = options.playlist;

  for (const [itemIndex, queueItem] of options.session.queue.items.entries()) {
    const entryTimestamp = getQueueEntryTimestamp(
      options.baseTimestamp,
      itemIndex,
    );

    if (queueItem.kind === 'track') {
      if (
        !savedSourceIds.has(queueItem.source.id) &&
        !trackedUnsavedSourceIds.has(queueItem.source.id)
      ) {
        trackedUnsavedSourceIds.add(queueItem.source.id);
        unsavedSources.push(queueItem.source);
      }

      playlist = addTrackToPlaylist(playlist, queueItem.source, entryTimestamp);
      continue;
    }

    // A composite is saved by reference, never as a track of its own.
    if (queueItem.kind === 'composite') {
      const composite = options.composites.find(({ id }) => {
        return id === queueItem.sourceId;
      });

      if (!composite) {
        return {
          issue: createMissingCompositeIssue(queueItem.title),
          playlist: null,
          unsavedSources: [],
        };
      }

      playlist = addCompositeToPlaylist(playlist, composite, entryTimestamp);
      continue;
    }

    const savedLoop = options.savedLoops.find((loop) => {
      return loop.id === queueItem.loopId;
    });

    if (!queueItem.loopId || !savedLoop) {
      return {
        issue: createMissingLoopIssue(queueItem.title),
        playlist: null,
        unsavedSources: [],
      };
    }

    playlist = addLoopToPlaylist(playlist, savedLoop, entryTimestamp);
  }

  return {
    issue: null,
    playlist,
    unsavedSources,
  };
};

export const appendQueueItemsToPlaylist = (options: {
  /** Defaults to the composites snapshot. */
  composites?: readonly CompositeTrack[];
  now?: string;
  playlist: Playlist;
  savedLoops: NamedLoop[];
  savedSources: DriveLibrarySource[];
  session: PlaylistPlaybackSession | null;
}) => {
  return captureQueueItemsIntoPlaylist({
    baseTimestamp:
      options.now ?? options.playlist.updatedAt ?? new Date().toISOString(),
    composites: options.composites ?? getCompositesSnapshot(),
    playlist: options.playlist,
    savedLoops: options.savedLoops,
    savedSources: options.savedSources,
    session: options.session,
  });
};

export const replaceQueueItemsInPlaylist = (options: {
  /** Defaults to the composites snapshot. */
  composites?: readonly CompositeTrack[];
  now?: string;
  playlist: Playlist;
  savedLoops: NamedLoop[];
  savedSources: DriveLibrarySource[];
  session: PlaylistPlaybackSession | null;
}) => {
  const baseTimestamp = options.now ?? new Date().toISOString();

  return captureQueueItemsIntoPlaylist({
    baseTimestamp,
    composites: options.composites ?? getCompositesSnapshot(),
    playlist: {
      ...options.playlist,
      items: [],
      updatedAt: baseTimestamp,
    },
    savedLoops: options.savedLoops,
    savedSources: options.savedSources,
    session: options.session,
  });
};

export const buildSavedPlaylistFromQueue = (options: {
  /** Defaults to the composites snapshot. */
  composites?: readonly CompositeTrack[];
  createId?: (ownerId: string, createdAt: string) => string;
  name: string;
  now?: string;
  ownerId: string;
  savedLoops: NamedLoop[];
  savedSources: DriveLibrarySource[];
  session: PlaylistPlaybackSession | null;
}): {
  issue: PlaylistDraftIssue | null;
  playlist: Playlist | null;
  unsavedSources: DriveLibrarySource[];
} => {
  const playlistResult = buildSavedPlaylist({
    createId: options.createId,
    name: options.name,
    now: options.now,
    ownerId: options.ownerId,
  });

  if (playlistResult.issue || !playlistResult.playlist) {
    return {
      issue: playlistResult.issue,
      playlist: null,
      unsavedSources: [],
    };
  }

  return captureQueueItemsIntoPlaylist({
    baseTimestamp: playlistResult.playlist.createdAt,
    composites: options.composites ?? getCompositesSnapshot(),
    playlist: playlistResult.playlist,
    savedLoops: options.savedLoops,
    savedSources: options.savedSources,
    session: options.session,
  });
};
