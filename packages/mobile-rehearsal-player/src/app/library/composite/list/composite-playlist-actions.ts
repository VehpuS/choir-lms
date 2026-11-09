import {
  addCompositeToPlaylist,
  createPlaylist,
  type CompositeTrack,
  type Playlist,
} from '@org/audio-library-models';

import type { BulkAcknowledgment } from '../../selection/bulk-playback-run';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../../storage/local-library-storage';

/**
 * Adding a composite to a playlist (composite-tracks 7.2), pure so the
 * Composites view and any later surface share it. The entry names the
 * composite by id; it plays against whatever the composite is at the time.
 */

type PlaylistComposite = Pick<CompositeTrack, 'id' | 'name' | 'stems'>;

export const addCompositeEntry = (
  playlist: Playlist,
  composite: PlaylistComposite,
  updatedAt: string = new Date().toISOString(),
): Playlist => addCompositeToPlaylist(playlist, composite, updatedAt);

/** A new playlist named by the user that starts with the composite. */
export const createPlaylistWithComposite = (
  name: string,
  composite: PlaylistComposite,
  now: string = new Date().toISOString(),
): Playlist =>
  addCompositeEntry(
    createPlaylist({
      name,
      ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
      createdAt: now,
    }),
    composite,
    now,
  );

export const getCompositeAddedAcknowledgment = (
  compositeName: string,
  playlistName: string,
): BulkAcknowledgment => ({
  title: 'Added to playlist',
  message: `“${compositeName}” added to ${playlistName}.`,
});
