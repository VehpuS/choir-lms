import type {
  PlayableItem,
  RehearsalQueueMode,
} from '@org/audio-library-models';
import { shuffleItems } from '@org/audio-library-runtime';

import type { PlaylistPlaybackSession } from './saved-playlist-playback-view-model';

// Applies a queue mode to any playback session, playlist-backed or transient
// ("Current queue"). Shuffle reorders only the items after the playing one and
// keeps the pre-shuffle order in `unshuffledItems`; ordered restores that order.
// Working from the session's own items (rather than rebuilding from a saved
// playlist) keeps queue edits and ad-hoc queued items intact across toggles.
export const rebuildQueueSessionForMode = (options: {
  mode: RehearsalQueueMode;
  random?: () => number;
  session: PlaylistPlaybackSession;
}): PlaylistPlaybackSession => {
  const { mode, session } = options;

  if (session.queue.mode === mode) {
    return session;
  }

  return mode === 'shuffle'
    ? shuffleUpcomingItems(session, options.random)
    : restoreUnshuffledOrder(session);
};

const shuffleUpcomingItems = (
  session: PlaylistPlaybackSession,
  random?: () => number,
): PlaylistPlaybackSession => {
  const playedAndCurrentItems = session.queue.items.slice(
    0,
    session.currentIndex + 1,
  );
  const upcomingItems = session.queue.items.slice(session.currentIndex + 1);

  return {
    ...session,
    queue: {
      ...session.queue,
      items: [...playedAndCurrentItems, ...shuffleItems(upcomingItems, random)],
      mode: 'shuffle',
    },
    unshuffledItems: session.queue.items,
  };
};

const restoreUnshuffledOrder = (
  session: PlaylistPlaybackSession,
): PlaylistPlaybackSession => {
  const currentItem = session.queue.items[session.currentIndex];
  const items = orderLikeSnapshot(
    session.queue.items,
    session.unshuffledItems ?? [],
  );
  const restoredCurrentIndex = currentItem ? items.indexOf(currentItem) : -1;

  return {
    ...session,
    currentIndex:
      restoredCurrentIndex >= 0 ? restoredCurrentIndex : session.currentIndex,
    queue: {
      ...session.queue,
      items,
      mode: 'ordered',
    },
    unshuffledItems: undefined,
  };
};

// Orders the live queue items by their position in the pre-shuffle snapshot.
// Items are matched by id (a queue may hold the same track more than once), so
// items removed while shuffled stay removed and items added while shuffled are
// kept, in their current relative order, after the restored ones.
const orderLikeSnapshot = (
  liveItems: PlayableItem[],
  snapshotItems: PlayableItem[],
) => {
  const remainingItems = [...liveItems];
  const restoredItems: PlayableItem[] = [];

  for (const snapshotItem of snapshotItems) {
    const matchIndex = remainingItems.findIndex((item) => {
      return item.id === snapshotItem.id;
    });

    if (matchIndex >= 0) {
      restoredItems.push(...remainingItems.splice(matchIndex, 1));
    }
  }

  return [...restoredItems, ...remainingItems];
};
