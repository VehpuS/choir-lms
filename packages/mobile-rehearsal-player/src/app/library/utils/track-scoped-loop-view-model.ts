import {
  createPlaylistEntryFromLoop,
  type NamedLoop,
  type Playlist,
} from '@org/audio-library-models';

import type { DriveLibrarySource } from './drive-library-view-model';

export type TrackScopedLoopDetailCopy = {
  body: string;
  emptyMessage: string;
  metadataLabel: string;
  title: string;
};

const TRACK_SCOPED_LOOP_PLAYLIST_ID_PREFIX = 'playlist:track-loops:';
const DEFAULT_REFERENCE_TIMESTAMP = '1970-01-01T00:00:00.000Z';

const pluralize = (count: number, noun: string) => {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
};

export const buildTrackScopedLoopPlaybackPlaylist = (options: {
  loops: NamedLoop[];
  source: DriveLibrarySource;
}): Playlist => {
  const playlistId = `${TRACK_SCOPED_LOOP_PLAYLIST_ID_PREFIX}${options.source.id}`;
  const firstLoop = options.loops[0] ?? null;
  const lastLoop = options.loops[options.loops.length - 1] ?? null;
  const referenceTimestamp =
    firstLoop?.createdAt ??
    options.source.modifiedTime ??
    DEFAULT_REFERENCE_TIMESTAMP;

  return {
    id: playlistId,
    name: `${options.source.name} loops`,
    items: options.loops.map((loop, sortIndex) => {
      return createPlaylistEntryFromLoop(loop, loop.createdAt, {
        playlistId,
        sortIndex,
      });
    }),
    ownershipScope: 'user',
    ownerId: options.source.id,
    createdAt: referenceTimestamp,
    updatedAt: lastLoop?.updatedAt ?? referenceTimestamp,
  } satisfies Playlist;
};

export const getTrackScopedLoopDetailCopy = (options: {
  loopCount: number;
  sourceName: string;
}): TrackScopedLoopDetailCopy => {
  return {
    body: `Play this track's saved loops in order, start from any loop row, or capture a new loop from ${options.sourceName}.`,
    emptyMessage: `No saved loops for ${options.sourceName} yet. Make new loop to capture the first practice segment.`,
    metadataLabel: `${pluralize(options.loopCount, 'saved loop')} • Parent track`,
    title: `${options.sourceName} loops`,
  };
};
