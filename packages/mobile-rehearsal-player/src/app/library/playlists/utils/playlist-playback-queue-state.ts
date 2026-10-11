import type {
  PlayableItem,
  RehearsalQueueMode,
  RepeatMode,
} from '@org/audio-library-models';
import { shuffleItems } from '@org/audio-library-runtime';

import type { PlaylistPlaybackSession } from './saved-playlist-playback-view-model';

type QueuePlayableItemsDuringPlaybackOptions = {
  activePlayableItem: PlayableItem | null;
  playableItems: readonly PlayableItem[];
  position: 'next' | 'up-next';
  repeatMode: RepeatMode;
  session: PlaylistPlaybackSession | null;
};

const TRANSIENT_QUEUE_PLAYLIST_ID = 'transient-queue';
const TRANSIENT_QUEUE_PLAYLIST_NAME = 'Current queue';

const moveItem = <Entity>(
  values: Entity[],
  fromIndex: number,
  toIndex: number,
) => {
  if (
    fromIndex < 0 ||
    fromIndex >= values.length ||
    toIndex < 0 ||
    toIndex >= values.length ||
    fromIndex === toIndex
  ) {
    return values;
  }

  const nextValues = [...values];
  const [movedValue] = nextValues.splice(fromIndex, 1);

  if (movedValue === undefined) {
    return values;
  }

  nextValues.splice(toIndex, 0, movedValue);

  return nextValues;
};

const resolveMovedQueueCurrentIndex = (options: {
  currentIndex: number;
  fromIndex: number;
  toIndex: number;
}) => {
  if (options.fromIndex === options.currentIndex) {
    return options.toIndex;
  }

  if (
    options.fromIndex < options.currentIndex &&
    options.toIndex >= options.currentIndex
  ) {
    return options.currentIndex - 1;
  }

  if (
    options.fromIndex > options.currentIndex &&
    options.toIndex <= options.currentIndex
  ) {
    return options.currentIndex + 1;
  }

  return options.currentIndex;
};

/**
 * Inserts an ordered block directly after the current item, without moving
 * the current item. The single-item action is the one-element block.
 */
export const queuePlayableItemsAsNext = (
  session: PlaylistPlaybackSession,
  playableItems: readonly PlayableItem[],
): PlaylistPlaybackSession => {
  const insertionIndex = Math.min(
    session.currentIndex + 1,
    session.queue.items.length,
  );

  return {
    ...session,
    queue: {
      ...session.queue,
      items: [
        ...session.queue.items.slice(0, insertionIndex),
        ...playableItems,
        ...session.queue.items.slice(insertionIndex),
      ],
    },
    requestedItemCount: session.requestedItemCount + playableItems.length,
  };
};

/** Appends an ordered block at the end of the queue. */
export const queuePlayableItemsAsUpNext = (
  session: PlaylistPlaybackSession,
  playableItems: readonly PlayableItem[],
): PlaylistPlaybackSession => {
  return {
    ...session,
    queue: {
      ...session.queue,
      items: [...session.queue.items, ...playableItems],
    },
    requestedItemCount: session.requestedItemCount + playableItems.length,
  };
};

export const queuePlayableItemAsNext = (
  session: PlaylistPlaybackSession,
  playableItem: PlayableItem,
): PlaylistPlaybackSession => {
  return queuePlayableItemsAsNext(session, [playableItem]);
};

export const queuePlayableItemAsUpNext = (
  session: PlaylistPlaybackSession,
  playableItem: PlayableItem,
): PlaylistPlaybackSession => {
  return queuePlayableItemsAsUpNext(session, [playableItem]);
};

export const movePlaylistPlaybackQueueItem = (
  session: PlaylistPlaybackSession,
  fromIndex: number,
  toIndex: number,
): PlaylistPlaybackSession => {
  if (
    fromIndex < 0 ||
    fromIndex >= session.queue.items.length ||
    toIndex < 0 ||
    toIndex >= session.queue.items.length ||
    fromIndex === toIndex
  ) {
    return session;
  }

  return {
    ...session,
    currentIndex: resolveMovedQueueCurrentIndex({
      currentIndex: session.currentIndex,
      fromIndex,
      toIndex,
    }),
    hasCompleted: false,
    queue: {
      ...session.queue,
      items: moveItem(session.queue.items, fromIndex, toIndex),
    },
  };
};

export const movePlaylistPlaybackQueueItemToStart = (
  session: PlaylistPlaybackSession,
  index: number,
): PlaylistPlaybackSession => {
  return movePlaylistPlaybackQueueItem(session, index, 0);
};

export const movePlaylistPlaybackQueueItemToEnd = (
  session: PlaylistPlaybackSession,
  index: number,
): PlaylistPlaybackSession => {
  return movePlaylistPlaybackQueueItem(
    session,
    index,
    session.queue.items.length - 1,
  );
};

export const removePlaylistPlaybackQueueItem = (
  session: PlaylistPlaybackSession,
  index: number,
): PlaylistPlaybackSession => {
  if (
    index < 0 ||
    index >= session.queue.items.length ||
    index === session.currentIndex
  ) {
    return session;
  }

  const nextItems = session.queue.items.filter((_, itemIndex) => {
    return itemIndex !== index;
  });

  return {
    ...session,
    currentIndex:
      index < session.currentIndex
        ? session.currentIndex - 1
        : session.currentIndex,
    hasCompleted: false,
    requestedItemCount: Math.max(0, session.requestedItemCount - 1),
    queue: {
      ...session.queue,
      items: nextItems,
    },
  };
};

export const selectPlaylistPlaybackQueueItem = (
  session: PlaylistPlaybackSession,
  index: number,
): {
  nextSession: PlaylistPlaybackSession;
  playableItem: PlayableItem | null;
} => {
  const playableItem = session.queue.items[index] ?? null;

  if (!playableItem) {
    return {
      nextSession: session,
      playableItem: null,
    };
  }

  return {
    nextSession: {
      ...session,
      currentIndex: index,
      hasCompleted: false,
    },
    playableItem,
  };
};

export const dedupePlayableItems = (items: PlayableItem[]): PlayableItem[] => {
  const seenItemIds = new Set<string>();

  return items.filter((item) => {
    if (seenItemIds.has(item.id)) {
      return false;
    }

    seenItemIds.add(item.id);
    return true;
  });
};

export const createTransientPlaybackSession = (options: {
  activePlayableItem: PlayableItem;
  repeatMode: RepeatMode;
}): PlaylistPlaybackSession => {
  return {
    currentIndex: 0,
    hasCompleted: false,
    playlistId: TRANSIENT_QUEUE_PLAYLIST_ID,
    playlistName: TRANSIENT_QUEUE_PLAYLIST_NAME,
    queue: {
      items: [options.activePlayableItem],
      mode: 'ordered',
      playlistId: TRANSIENT_QUEUE_PLAYLIST_ID,
      repeatMode: options.repeatMode,
    },
    requestedItemCount: 1,
  } satisfies PlaylistPlaybackSession;
};

/**
 * A `Current queue` session over a list of items. Shuffle mode shuffles the
 * whole list (nothing is playing yet) and keeps the given order in
 * `unshuffledItems`, so switching back to ordered restores it, the same
 * contract `rebuildQueueSessionForMode` keeps for a running queue.
 */
export const createTransientPlaybackSessionFromItems = (options: {
  items: PlayableItem[];
  mode?: RehearsalQueueMode;
  random?: () => number;
  repeatMode: RepeatMode;
}): PlaylistPlaybackSession => {
  const isShuffled = options.mode === 'shuffle';

  return {
    currentIndex: 0,
    hasCompleted: false,
    playlistId: TRANSIENT_QUEUE_PLAYLIST_ID,
    playlistName: TRANSIENT_QUEUE_PLAYLIST_NAME,
    queue: {
      items: isShuffled
        ? shuffleItems(options.items, options.random)
        : options.items,
      mode: isShuffled ? 'shuffle' : 'ordered',
      playlistId: TRANSIENT_QUEUE_PLAYLIST_ID,
      repeatMode: options.repeatMode,
    },
    requestedItemCount: options.items.length,
    ...(isShuffled ? { unshuffledItems: options.items } : {}),
  } satisfies PlaylistPlaybackSession;
};

export const isTransientQueueSession = (
  session: PlaylistPlaybackSession | null,
) => {
  return session?.playlistId === TRANSIENT_QUEUE_PLAYLIST_ID;
};

export const canShowQueuePlaylistActions = (
  session: PlaylistPlaybackSession | null,
) => {
  return session !== null && session.queue.items.length > 0;
};

export const canUpdateQueuePlaylist = (
  session: PlaylistPlaybackSession | null,
) => {
  return (
    canShowQueuePlaylistActions(session) && !isTransientQueueSession(session)
  );
};

/**
 * Queues a block during playback. A standalone item is promoted into the
 * transient queue first, exactly as for a single item; with nothing playing
 * there is no queue to insert into and the result is `null`.
 */
export const queuePlayableItemsDuringPlayback = (
  options: QueuePlayableItemsDuringPlaybackOptions,
): PlaylistPlaybackSession | null => {
  const session =
    options.session ??
    (options.activePlayableItem
      ? createTransientPlaybackSession({
          activePlayableItem: options.activePlayableItem,
          repeatMode: options.repeatMode,
        })
      : null);

  if (!session) {
    return null;
  }

  return options.position === 'next'
    ? queuePlayableItemsAsNext(session, options.playableItems)
    : queuePlayableItemsAsUpNext(session, options.playableItems);
};

export const queuePlayableItemDuringPlayback = (
  options: Omit<QueuePlayableItemsDuringPlaybackOptions, 'playableItems'> & {
    playableItem: PlayableItem;
  },
): PlaylistPlaybackSession | null => {
  const { playableItem, ...rest } = options;

  return queuePlayableItemsDuringPlayback({
    ...rest,
    playableItems: [playableItem],
  });
};
