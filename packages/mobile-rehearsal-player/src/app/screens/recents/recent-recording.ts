import type { PlayableItem } from '@org/audio-library-models';

import { isTransientQueueSession } from '../../library/playlists/utils/playlist-playback-queue-state';
import type { PlaylistPlaybackSession } from '../../library/playlists/utils/saved-playlist-playback-view-model';
import {
  buildRecentPlaylistItem,
  buildRecentRehearsalItem,
  type RecentRehearsalItem,
} from './history';

type RecentRecordingOptions = {
  activePlayableItem: PlayableItem;
  activePlaylistSession: PlaylistPlaybackSession | null;
  playedAt: string;
};

/**
 * Decides what the active item adds to Recents, or null for nothing:
 * - a saved playlist session records the playlist (one row however many of
 *   its tracks play), with the active track as its last entry;
 * - the transient `Current queue` and standalone playback record the item.
 */
export const getRecentRehearsalToRecord = (
  options: RecentRecordingOptions,
): RecentRehearsalItem | null => {
  const { activePlayableItem, activePlaylistSession, playedAt } = options;

  if (
    !activePlaylistSession ||
    isTransientQueueSession(activePlaylistSession)
  ) {
    return buildRecentRehearsalItem({ activePlayableItem, playedAt });
  }

  const entryId = activePlayableItem.playlistEntryId;

  // A playlist session starts before its first item loads, so for a moment
  // the active item is whatever played before. Recording it against the
  // playlist would write a stale entry id; the effect runs again once the
  // playlist's own item is active.
  const isInSessionQueue =
    entryId !== undefined &&
    activePlaylistSession.queue.items.some(
      (item) => item.playlistEntryId === entryId,
    );

  if (!entryId || !isInSessionQueue) {
    return null;
  }

  return buildRecentPlaylistItem({
    lastEntryId: entryId,
    playedAt,
    playlistId: activePlaylistSession.playlistId,
    playlistName: activePlaylistSession.playlistName,
  });
};
