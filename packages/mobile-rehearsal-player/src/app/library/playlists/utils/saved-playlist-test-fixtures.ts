import type {
  DriveAudioSource,
  NamedLoop,
  Playlist,
  RehearsalQueueMode,
  RepeatMode,
} from '@org/audio-library-models';
import {
  addLoopToPlaylist,
  addTrackToPlaylist,
  createPlaylist,
} from '@org/audio-library-models';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../../test-utils/library-test-fixtures.js';
import {
  buildPlaylistPlaybackSession,
  type PlaylistPlaybackSession,
} from './saved-playlist-playback-view-model.js';

const WARMUPS_OWNER_ID = 'user-1';
const WARMUPS_CREATED_AT = '2026-05-12T00:00:00.000Z';
const TRACK_ADDED_AT = '2026-05-12T00:01:00.000Z';
const LOOP_ADDED_AT = '2026-05-12T00:02:00.000Z';
const TENOR_TRACK_ADDED_AT = '2026-05-12T00:03:00.000Z';

export const TENOR_PLAYABLE_SOURCE: DriveAudioSource = {
  ...PLAYABLE_SOURCE,
  id: 'drive:tenor-line',
  name: 'Tenor Line.mp3',
};

const createWarmupsPlaylist = () => {
  return createPlaylist({
    createdAt: WARMUPS_CREATED_AT,
    name: 'Warmups',
    ownerId: WARMUPS_OWNER_ID,
  });
};

export const buildTrackOnlyWarmupsPlaylist = () => {
  return addTrackToPlaylist(
    createWarmupsPlaylist(),
    PLAYABLE_SOURCE,
    TRACK_ADDED_AT,
  );
};

export const buildWarmupsPlaylist = () => {
  return addLoopToPlaylist(
    buildTrackOnlyWarmupsPlaylist(),
    SAVED_LOOP,
    LOOP_ADDED_AT,
  );
};

export const buildWarmupsQueuePlaylist = () => {
  return addTrackToPlaylist(
    buildWarmupsPlaylist(),
    TENOR_PLAYABLE_SOURCE,
    TENOR_TRACK_ADDED_AT,
  );
};

type BuildWarmupsPlaybackSessionOptions = {
  loops?: NamedLoop[];
  mode?: RehearsalQueueMode;
  playlist?: Playlist;
  repeatMode?: RepeatMode;
  sources?: DriveAudioSource[];
  startEntryId?: string;
};

export const buildWarmupsPlaybackSession = (
  options: BuildWarmupsPlaybackSessionOptions = {},
): PlaylistPlaybackSession => {
  const result = buildPlaylistPlaybackSession({
    loops: options.loops ?? [SAVED_LOOP],
    mode: options.mode ?? 'ordered',
    playlist: options.playlist ?? buildWarmupsPlaylist(),
    repeatMode: options.repeatMode ?? 'off',
    sources: options.sources ?? [PLAYABLE_SOURCE, TENOR_PLAYABLE_SOURCE],
    startEntryId: options.startEntryId,
  });

  if (!result.session) {
    throw new Error('Expected a playlist playback session.');
  }

  return result.session;
};

export const buildThreeItemQueueSession = () => {
  return buildWarmupsPlaybackSession({
    playlist: buildWarmupsQueuePlaylist(),
  });
};
