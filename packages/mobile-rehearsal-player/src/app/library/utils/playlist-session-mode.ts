import type {
  NamedLoop,
  Playlist,
  RehearsalQueueMode,
} from '@org/audio-library-models';

import type { DriveLibrarySource } from './drive-library-view-model';
import {
  buildPlaylistPlaybackSession,
  getPlaylistPlaybackCurrentItem,
  type PlaylistPlaybackSession,
} from './saved-playlist-playback-view-model';

export type ActivePlaylistContext = {
  loops: NamedLoop[];
  playlist: Playlist;
  sources: DriveLibrarySource[];
};

export const rebuildPlaylistPlaybackSessionForMode = (options: {
  loops: NamedLoop[];
  mode: RehearsalQueueMode;
  playlist: Playlist;
  random?: () => number;
  session: PlaylistPlaybackSession;
  sources: DriveLibrarySource[];
}) => {
  const currentItem = getPlaylistPlaybackCurrentItem(options.session);

  return buildPlaylistPlaybackSession({
    loops: options.loops,
    mode: options.mode,
    playlist: options.playlist,
    random: options.random,
    repeatMode: options.session.queue.repeatMode,
    sources: options.sources,
    startEntryId: currentItem?.playlistEntryId,
  });
};

export const syncActivePlaylistContext = (options: {
  currentContext: ActivePlaylistContext | null;
  loops: NamedLoop[];
  playlists: Playlist[];
  session: PlaylistPlaybackSession | null;
  sources: DriveLibrarySource[];
}) => {
  if (!options.currentContext || !options.session) {
    return options.currentContext;
  }

  const persistedPlaylist = options.playlists.find((playlist) => {
    return playlist.id === options.session?.playlistId;
  });

  if (!persistedPlaylist) {
    return options.currentContext;
  }

  return {
    loops: options.loops,
    playlist: persistedPlaylist,
    sources: options.sources,
  } satisfies ActivePlaylistContext;
};
