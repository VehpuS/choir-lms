import {
  addRecordingToPlaylist,
  createPlaylist,
  type Playlist,
  type Recording,
} from '@org/audio-library-models';

import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../storage/local-library-storage';
import type { BulkAcknowledgment } from '../selection/bulk-playback-run';

/**
 * Adding recordings to a playlist (rehearsal-recording design Decision 16),
 * pure so the panel, the Library view and the bulk bar share it.
 */

export const countLabel = (count: number) =>
  `${count} ${count === 1 ? 'recording' : 'recordings'}`;

/** The sheet title: the recording's name, or how many are being added. */
export const getPlaylistPickerTitle = (
  recordings: readonly Pick<Recording, 'name'>[],
) =>
  recordings.length === 1 ? recordings[0].name : countLabel(recordings.length);

/** Appends the recordings in the order given. */
export const addRecordingsToPlaylist = (
  playlist: Playlist,
  recordings: readonly Recording[],
  updatedAt: string = new Date().toISOString(),
): Playlist =>
  recordings.reduce(
    (current, recording) =>
      addRecordingToPlaylist(current, recording, updatedAt),
    playlist,
  );

/** A new playlist named by the user that starts with the recordings. */
export const createPlaylistWithRecordings = (
  name: string,
  recordings: readonly Recording[],
  now: string = new Date().toISOString(),
): Playlist =>
  addRecordingsToPlaylist(
    createPlaylist({
      name,
      ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
      createdAt: now,
    }),
    recordings,
    now,
  );

export const getAddedToPlaylistAcknowledgment = (
  count: number,
  playlistName: string,
): BulkAcknowledgment => ({
  title: 'Added to playlist',
  message: `${countLabel(count)} added to ${playlistName}.`,
});
