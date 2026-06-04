import type {
  NamedLoop,
  Playlist,
  RehearsalQueueMode,
} from '@org/audio-library-models';

import type { DriveLibrarySource } from './drive-library-view-model';
import {
  buildPlaylistPlaybackSession,
  getPlaylistPlaybackCurrentItem,
  type PlaylistPlaybackSession,
} from './saved-playlist-playback-view-model';

export type ActivePlaylistContext = {
  loops: NamedLoop[];
  playlist: Playlist;
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
