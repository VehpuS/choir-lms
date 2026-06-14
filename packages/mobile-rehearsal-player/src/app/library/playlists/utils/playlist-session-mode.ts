import type {
  NamedLoop,
  Playlist,
  RehearsalQueueMode,
} from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import {
  hasPlayableItemChanged,
  resolveSynchronizedPlayableItem,
} from '../../playback/utils/saved-track-playback-view-model';
import {
  buildPlaylistPlaybackSession,
  getPlaylistPlaybackCurrentItem,
  isTransientQueueSession,
  type PlaylistPlaybackSession,
} from './saved-playlist-playback-view-model';

export type ActivePlaylistContext = {
  loops: NamedLoop[];
  playlist: Playlist;
  sources: DriveLibrarySource[];
};

type SyncActivePlaylistPlaybackSessionOptions = {
  currentContext: ActivePlaylistContext | null;
  loops: NamedLoop[];
  playlists: Playlist[];
  session: PlaylistPlaybackSession | null;
  sources: DriveLibrarySource[];
};

const isAdHocQueuedItem = (
  item: PlaylistPlaybackSession['queue']['items'][number],
) => {
  return item.playlistEntryId === undefined;
};

const mergeAdHocQueuedItemsIntoSession = (options: {
  rebuiltSession: PlaylistPlaybackSession;
  previousSession: PlaylistPlaybackSession;
}) => {
  const currentItem = getPlaylistPlaybackCurrentItem(options.previousSession);

  if (!currentItem) {
    return options.rebuiltSession;
  }

  const adHocItemsBeforeCurrent = options.previousSession.queue.items
    .slice(0, options.previousSession.currentIndex)
    .filter(isAdHocQueuedItem);
  const adHocItemsAfterCurrent = options.previousSession.queue.items
    .slice(options.previousSession.currentIndex + 1)
    .filter(isAdHocQueuedItem);
  const adHocItemCount =
    adHocItemsBeforeCurrent.length + adHocItemsAfterCurrent.length;

  if (currentItem.playlistEntryId) {
    if (adHocItemCount === 0) {
      return options.rebuiltSession;
    }

    const rebuiltCurrentItem = getPlaylistPlaybackCurrentItem(
      options.rebuiltSession,
    );

    if (!rebuiltCurrentItem) {
      return options.rebuiltSession;
    }

    const rebuiltItemsBeforeCurrent = options.rebuiltSession.queue.items.slice(
      0,
      options.rebuiltSession.currentIndex,
    );
    const rebuiltItemsAfterCurrent = options.rebuiltSession.queue.items.slice(
      options.rebuiltSession.currentIndex + 1,
    );

    return {
      ...options.rebuiltSession,
      currentIndex:
        rebuiltItemsBeforeCurrent.length + adHocItemsBeforeCurrent.length,
      queue: {
        ...options.rebuiltSession.queue,
        items: [
          ...rebuiltItemsBeforeCurrent,
          ...adHocItemsBeforeCurrent,
          rebuiltCurrentItem,
          ...adHocItemsAfterCurrent,
          ...rebuiltItemsAfterCurrent,
        ],
      },
      requestedItemCount:
        options.rebuiltSession.requestedItemCount + adHocItemCount,
    };
  }

  return {
    ...options.rebuiltSession,
    currentIndex:
      options.rebuiltSession.queue.items.length +
      adHocItemsBeforeCurrent.length,
    queue: {
      ...options.rebuiltSession.queue,
      items: [
        ...options.rebuiltSession.queue.items,
        ...adHocItemsBeforeCurrent,
        currentItem,
        ...adHocItemsAfterCurrent,
      ],
    },
    requestedItemCount:
      options.rebuiltSession.requestedItemCount + adHocItemCount + 1,
  };
};

export const bindQueueToPlaylistPlaybackSession = (options: {
  playlist: Playlist;
  session: PlaylistPlaybackSession | null;
}): PlaylistPlaybackSession | null => {
  if (
    !options.session ||
    options.session.queue.items.length !== options.playlist.items.length ||
    options.session.currentIndex >= options.playlist.items.length
  ) {
    return null;
  }

  return {
    ...options.session,
    playlistId: options.playlist.id,
    playlistName: options.playlist.name,
    queue: {
      ...options.session.queue,
      items: options.session.queue.items.map((item, index) => {
        return {
          ...item,
          playlistEntryId: options.playlist.items[index]?.id,
          playlistId: options.playlist.id,
        };
      }),
      playlistId: options.playlist.id,
    },
  } satisfies PlaylistPlaybackSession;
};

export const rebuildPlaylistPlaybackSessionForMode = (options: {
  loops: NamedLoop[];
  mode: RehearsalQueueMode;
  playlist: Playlist;
  random?: () => number;
  session: PlaylistPlaybackSession;
  sources: DriveLibrarySource[];
}) => {
  const currentItem = getPlaylistPlaybackCurrentItem(options.session);

  const rebuiltSession = buildPlaylistPlaybackSession({
    loops: options.loops,
    mode: options.mode,
    playlist: options.playlist,
    random: options.random,
    repeatMode: options.session.queue.repeatMode,
    sources: options.sources,
    startEntryId: currentItem?.playlistEntryId,
  });

  if (rebuiltSession.issue || !rebuiltSession.session) {
    return rebuiltSession;
  }

  return {
    issue: null,
    session: mergeAdHocQueuedItemsIntoSession({
      rebuiltSession: rebuiltSession.session,
      previousSession: options.session,
    }),
  };
};

export const syncActivePlaylistContext = (options: {
  currentContext: ActivePlaylistContext | null;
  loops: NamedLoop[];
  playlists: Playlist[];
  session: PlaylistPlaybackSession | null;
  sources: DriveLibrarySource[];
}) => {
  if (!options.currentContext || !options.session) {
    return options.currentContext;
  }

  const persistedPlaylist = options.playlists.find((playlist) => {
    return playlist.id === options.session?.playlistId;
  });

  if (!persistedPlaylist) {
    return options.currentContext;
  }

  return {
    loops: options.loops,
    playlist: persistedPlaylist,
    sources: options.sources,
  } satisfies ActivePlaylistContext;
};

const syncPlaylistPlaybackQueueItems = (options: {
  loops: NamedLoop[];
  session: PlaylistPlaybackSession;
  sources: DriveLibrarySource[];
}) => {
  let hasQueueItemChanged = false;

  const synchronizedQueueItems = options.session.queue.items.map(
    (playableItem) => {
      const synchronizedPlayableItem =
        resolveSynchronizedPlayableItem({
          loops: options.loops,
          playableItem,
          sources: options.sources,
        }) ?? playableItem;

      hasQueueItemChanged ||= hasPlayableItemChanged(
        playableItem,
        synchronizedPlayableItem,
      );

      return synchronizedPlayableItem;
    },
  );

  if (!hasQueueItemChanged) {
    return options.session;
  }

  return {
    ...options.session,
    queue: {
      ...options.session.queue,
      items: synchronizedQueueItems,
    },
  } satisfies PlaylistPlaybackSession;
};

const hasPlaylistPlaybackSessionChanged = (
  currentSession: PlaylistPlaybackSession,
  nextSession: PlaylistPlaybackSession,
) => {
  if (currentSession === nextSession) {
    return false;
  }

  if (
    currentSession.currentIndex !== nextSession.currentIndex ||
    currentSession.hasCompleted !== nextSession.hasCompleted ||
    currentSession.playlistId !== nextSession.playlistId ||
    currentSession.playlistName !== nextSession.playlistName ||
    currentSession.requestedItemCount !== nextSession.requestedItemCount ||
    currentSession.queue.playlistId !== nextSession.queue.playlistId ||
    currentSession.queue.mode !== nextSession.queue.mode ||
    currentSession.queue.repeatMode !== nextSession.queue.repeatMode ||
    currentSession.queue.items.length !== nextSession.queue.items.length
  ) {
    return true;
  }

  return nextSession.queue.items.some((playableItem, index) => {
    return hasPlayableItemChanged(
      currentSession.queue.items[index] ?? null,
      playableItem,
    );
  });
};

export const syncActivePlaylistPlaybackSession = (
  options: SyncActivePlaylistPlaybackSessionOptions,
) => {
  const nextContext = syncActivePlaylistContext(options);

  if (!options.session) {
    return {
      context: nextContext,
      issue: null,
      session: null,
    };
  }

  if (isTransientQueueSession(options.session) || !nextContext) {
    return {
      context: nextContext,
      issue: null,
      session: syncPlaylistPlaybackQueueItems({
        loops: options.loops,
        session: options.session,
        sources: options.sources,
      }),
    };
  }

  const rebuiltSession = rebuildPlaylistPlaybackSessionForMode({
    loops: nextContext.loops,
    mode: options.session.queue.mode,
    playlist: nextContext.playlist,
    session: options.session,
    sources: nextContext.sources,
  });

  const synchronizedSession = syncPlaylistPlaybackQueueItems({
    loops: options.loops,
    session: rebuiltSession.session ?? options.session,
    sources: options.sources,
  });

  return {
    context: nextContext,
    issue: rebuiltSession.issue,
    session: hasPlaylistPlaybackSessionChanged(
      options.session,
      synchronizedSession,
    )
      ? synchronizedSession
      : options.session,
  };
};
