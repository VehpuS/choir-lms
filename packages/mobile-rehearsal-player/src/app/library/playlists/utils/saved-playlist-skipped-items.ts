import type {
  PlaylistPlaybackIssue,
  PlaylistPlaybackSession,
} from './saved-playlist-playback-view-model';

/**
 * What to tell the user when a playlist starts without some of its items (a
 * deleted recording, track or loop): they are skipped and the rest plays, so
 * the message says how many and why (rehearsal-recording spec: skipped with a
 * message). `null` when nothing was skipped.
 */
export const getSkippedItemsIssue = (
  session: Pick<
    PlaylistPlaybackSession,
    'playlistId' | 'queue' | 'requestedItemCount'
  >,
): PlaylistPlaybackIssue | null => {
  const skipped = session.requestedItemCount - session.queue.items.length;

  if (skipped <= 0) {
    return null;
  }

  return {
    message: `${skipped} ${skipped === 1 ? 'item was' : 'items were'} skipped because ${skipped === 1 ? 'it is' : 'they are'} no longer available (a deleted recording, track or loop). The rest of the playlist plays.`,
    playlistId: session.playlistId,
    title: 'Playlist items skipped',
  };
};
