import type { PlayableItem, RepeatMode } from '@org/audio-library-models';

import type { PlaylistPlaybackSession } from './saved-playlist-playback-view-model';

type QueuePlayableItemDuringPlaybackOptions = {
  activePlayableItem: PlayableItem | null;
  playableItem: PlayableItem;
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

export const queuePlayableItemAsNext = (
  session: PlaylistPlaybackSession,
  playableItem: PlayableItem,
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
        playableItem,
        ...session.queue.items.slice(insertionIndex),
      ],
    },
    requestedItemCount: session.requestedItemCount + 1,
  };
};

export const queuePlayableItemAsUpNext = (
  session: PlaylistPlaybackSession,
  playableItem: PlayableItem,
): PlaylistPlaybackSession => {
  return {
    ...session,
    queue: {
      ...session.queue,
      items: [...session.queue.items, playableItem],
    },
    requestedItemCount: session.requestedItemCount + 1,
  };
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

export const dedupePlayableItems = (
  items: PlayableItem[],
): PlayableItem[] => {
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
  return canShowQueuePlaylistActions(session) && !isTransientQueueSession(session);
};

export const queuePlayableItemDuringPlayback = (
  options: QueuePlayableItemDuringPlaybackOptions,
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
    ? queuePlayableItemAsNext(session, options.playableItem)
    : queuePlayableItemAsUpNext(session, options.playableItem);
};
