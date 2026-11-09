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
  /**
   * The name of a saved playlist, for items queued from a playlist other than
   * the running one. Absent or unresolved means that playlist cannot be
   * recorded.
   */
  resolvePlaylistName?: (playlistId: string) => string | null;
};

/**
 * Decides what the active item adds to Recents, or null for nothing. An item
 * is recorded as what it belongs to:
 * - an item of the running saved playlist records that playlist (one row
 *   however many of its tracks play), with the item as its last entry;
 * - an item queued from another saved playlist records that playlist;
 * - a standalone item queued into the session, the transient `Current queue`
 *   and standalone playback record the item itself.
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
  const sessionItems = activePlaylistSession.queue.items;

  // A playlist session starts before its first item loads, so for a moment
  // the active item is whatever played before. It is not in the session's
  // queue, and recording it would write a stale entry or item; the effect
  // runs again once the session's own item is active.
  const isInSessionQueue = entryId
    ? sessionItems.some((item) => item.playlistEntryId === entryId)
    : sessionItems.some((item) => item.id === activePlayableItem.id);

  if (!isInSessionQueue) {
    return null;
  }

  if (!entryId) {
    return buildRecentRehearsalItem({ activePlayableItem, playedAt });
  }

  const playlistId = activePlayableItem.playlistId;
  const isOwnItem =
    !playlistId || playlistId === activePlaylistSession.playlistId;
  const playlistName = isOwnItem
    ? activePlaylistSession.playlistName
    : options.resolvePlaylistName?.(playlistId);

  if (!playlistName) {
    return null;
  }

  return buildRecentPlaylistItem({
    lastEntryId: entryId,
    playedAt,
    playlistId: isOwnItem ? activePlaylistSession.playlistId : playlistId,
    playlistName,
  });
};
