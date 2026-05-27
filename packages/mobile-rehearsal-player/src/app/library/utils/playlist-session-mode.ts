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
