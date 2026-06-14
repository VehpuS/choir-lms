import {
  type NamedLoop,
  type Playlist,
  type RehearsalQueueMode,
  type RepeatMode,
} from '@org/audio-library-models';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { DriveLibrarySource } from '../../../drive/utils/drive-library-view-model';
import { type ActivePlaylistContext } from '../../../playlists/utils/playlist-session-mode';
import {
  buildPlaylistPlaybackSession,
  getPlaylistPlaybackCurrentItem,
  type PlaylistPlaybackSession,
} from '../../../playlists/utils/saved-playlist-playback-view-model';
import type { SavedTrackPlaybackController } from '../../utils/saved-track-playback-controller';
import {
  createSavedTrackPlaybackRuntimeIssue,
  type SavedTrackPlaybackIssue,
} from '../../utils/saved-track-playback-view-model';
import { mapPlaylistPlaybackIssue } from './shared';

type StartPlaylistPlaybackOptions = {
  activePlaylistContextRef: MutableRefObject<ActivePlaylistContext | null>;
  loops: NamedLoop[];
  mode: RehearsalQueueMode;
  playbackController: SavedTrackPlaybackController;
  playlist: Playlist;
  playlistRepeatMode: RepeatMode;
  setActivePlaylistSession: Dispatch<
    SetStateAction<PlaylistPlaybackSession | null>
  >;
  setIsPreparing: Dispatch<SetStateAction<boolean>>;
  setIssue: Dispatch<SetStateAction<SavedTrackPlaybackIssue | null>>;
  sources: DriveLibrarySource[];
  startEntryId?: string;
};

export const startPlaylistPlayback = async (
  options: StartPlaylistPlaybackOptions,
) => {
  const nextSession = buildPlaylistPlaybackSession({
    loops: options.loops,
    mode: options.mode,
    playlist: options.playlist,
    repeatMode: options.playlistRepeatMode,
    sources: options.sources,
    startEntryId: options.startEntryId,
  });

  if (nextSession.issue || !nextSession.session) {
    options.setActivePlaylistSession(null);
    options.setIssue(
      nextSession.issue ? mapPlaylistPlaybackIssue(nextSession.issue) : null,
    );
    return;
  }

  const firstPlayableItem = getPlaylistPlaybackCurrentItem(nextSession.session);

  if (!firstPlayableItem) {
    options.setActivePlaylistSession(null);
    options.setIssue(
      mapPlaylistPlaybackIssue({
        message:
          'This rehearsal playlist does not currently contain any playable saved tracks or loops.',
        playlistId: options.playlist.id,
        title: 'Playlist has no playable items',
      }),
    );
    return;
  }

  options.setIssue(null);
  options.setIsPreparing(true);

  try {
    if (await options.playbackController.loadPlayableItem(firstPlayableItem)) {
      options.activePlaylistContextRef.current = {
        loops: options.loops,
        playlist: options.playlist,
        sources: options.sources,
      };
      options.setActivePlaylistSession(nextSession.session);
    }
  } catch (error) {
    options.setIssue(
      createSavedTrackPlaybackRuntimeIssue(firstPlayableItem, error),
    );
  } finally {
    options.setIsPreparing(false);
  }
};
