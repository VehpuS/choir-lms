import {
  addLoopToPlaylist,
  addTrackToPlaylist,
  type DriveAudioSource,
  type NamedLoop,
  type Playlist,
} from '@org/audio-library-models';

import {
  buildSavedPlaylist,
  type PlaylistDraftIssue,
} from '../playlists/utils/saved-playlist-view-model';
import type { PlaybackRef } from './playback-expansion';

export type BulkPlaylistResult = {
  issue: PlaylistDraftIssue | null;
  /** Refs whose track or loop is no longer saved, so they were left out. */
  missingCount: number;
  playlist: Playlist | null;
};

const getEntryTimestamp = (baseTimestamp: string, entryIndex: number) => {
  const baseMs = Date.parse(baseTimestamp);
  const timestampMs = Number.isNaN(baseMs)
    ? Date.now() + entryIndex + 1
    : baseMs + entryIndex + 1;

  return new Date(timestampMs).toISOString();
};

/**
 * Appends the effective items as entries, in order, through the same entry
 * constructors the single-item flow uses. Each entry gets its own timestamp so
 * entries keep the order they were added in.
 */
export const appendRefsToPlaylist = (options: {
  now?: string;
  playlist: Playlist;
  refs: readonly PlaybackRef[];
  savedLoops: NamedLoop[];
  savedSources: DriveAudioSource[];
}): BulkPlaylistResult => {
  // Entry ids derive from their timestamp, so new entries must start after the
  // playlist's latest entry or a second append in the same millisecond would
  // reuse an id (and removing by entry id would hit both).
  const baseTimestamp = new Date(
    Math.max(
      Date.parse(
        options.now ?? options.playlist.updatedAt ?? new Date().toISOString(),
      ) || Date.now(),
      ...options.playlist.items.map(
        ({ createdAt }) => Date.parse(createdAt) || 0,
      ),
    ),
  ).toISOString();
  let playlist = options.playlist;
  let missingCount = 0;

  for (const [index, ref] of options.refs.entries()) {
    const timestamp = getEntryTimestamp(baseTimestamp, index);

    if (ref.kind === 'track') {
      const source = options.savedSources.find(({ id }) => id === ref.entityId);

      if (!source) {
        missingCount += 1;
        continue;
      }

      playlist = addTrackToPlaylist(playlist, source, timestamp);
      continue;
    }

    const loop = options.savedLoops.find(({ id }) => id === ref.entityId);

    if (!loop) {
      missingCount += 1;
      continue;
    }

    playlist = addLoopToPlaylist(playlist, loop, timestamp);
  }

  return { issue: null, missingCount, playlist };
};

/** `Save as playlist`: a new playlist, named and validated like any other. */
export const buildPlaylistFromRefs = (options: {
  createId?: (ownerId: string, createdAt: string) => string;
  name: string;
  now?: string;
  ownerId: string;
  refs: readonly PlaybackRef[];
  savedLoops: NamedLoop[];
  savedSources: DriveAudioSource[];
}): BulkPlaylistResult => {
  const built = buildSavedPlaylist({
    createId: options.createId,
    name: options.name,
    now: options.now,
    ownerId: options.ownerId,
  });

  if (built.issue || !built.playlist) {
    return { issue: built.issue, missingCount: 0, playlist: null };
  }

  return appendRefsToPlaylist({
    now: built.playlist.createdAt,
    playlist: built.playlist,
    refs: options.refs,
    savedLoops: options.savedLoops,
    savedSources: options.savedSources,
  });
};
