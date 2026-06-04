import {
  addLoopToPlaylist,
  addTrackToPlaylist,
  type NamedLoop,
  type Playlist,
} from '@org/audio-library-models';

import type { DriveLibrarySource } from './drive-library-view-model';
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
    message: `The queue item "${loopTitle}" no longer has a saved loop source. Remove it from Up Next before saving this playlist.`,
  };
};

const getQueueEntryTimestamp = (baseTimestamp: string, itemIndex: number) => {
  const baseMs = Date.parse(baseTimestamp);
  const timestampMs = Number.isNaN(baseMs)
    ? Date.now() + itemIndex + 1
    : baseMs + itemIndex + 1;

  return new Date(timestampMs).toISOString();
};

export const buildSavedPlaylistFromQueue = (options: {
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
  if (!options.session || options.session.queue.items.length === 0) {
    return {
      issue: NO_QUEUE_CAPTURE_ISSUE,
      playlist: null,
      unsavedSources: [],
    };
  }

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

  const savedSourceIds = new Set(
    options.savedSources.map((source) => {
      return source.id;
    }),
  );
  const trackedUnsavedSourceIds = new Set<string>();
  const unsavedSources: DriveLibrarySource[] = [];
  let playlist = playlistResult.playlist;

  for (const [itemIndex, queueItem] of options.session.queue.items.entries()) {
    const entryTimestamp = getQueueEntryTimestamp(
      playlist.createdAt,
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
