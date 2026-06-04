import type {
  DriveAudioSource,
  NamedLoop,
  PlayableItem,
  Playlist,
  RehearsalQueueMode,
  RepeatMode,
} from '@org/audio-library-models';
import {
  createPlaybackQueue,
  resolveNextQueueIndex,
  resolvePreviousQueueIndex,
  type PlaybackQueue,
} from '@org/audio-library-runtime';

import type { SavedTrackPlaybackState } from './saved-track-playback-view-model';

export type PlaylistPlaybackActionCopy = {
  disabled: boolean;
  label: string;
};

export type PlaylistPlaybackIssue = {
  message: string;
  playlistId: string;
  title: string;
};

export type PlaylistPlaybackSession = {
  currentIndex: number;
  hasCompleted: boolean;
  playlistId: string;
  playlistName: string;
  queue: PlaybackQueue;
  requestedItemCount: number;
};

type BuildPlaylistPlaybackSessionOptions = {
  loops: NamedLoop[];
  mode: RehearsalQueueMode;
  playlist: Playlist;
  random?: () => number;
  repeatMode: RepeatMode;
  sources: DriveAudioSource[];
  startEntryId?: string;
};

type QueuePlayableItemDuringPlaybackOptions = {
  activePlayableItem: PlayableItem | null;
  playableItem: PlayableItem;
  position: 'next' | 'up-next';
  repeatMode: RepeatMode;
  session: PlaylistPlaybackSession | null;
};

const ORDERED_BUTTON_LABEL = 'Play ordered';
const SHUFFLE_BUTTON_LABEL = 'Shuffle play';
const TRANSIENT_QUEUE_PLAYLIST_ID = 'transient-queue';
const TRANSIENT_QUEUE_PLAYLIST_NAME = 'Current queue';

const getBaseActionLabel = (mode: RehearsalQueueMode) => {
  return mode === 'ordered' ? ORDERED_BUTTON_LABEL : SHUFFLE_BUTTON_LABEL;
};

export const PLAYLIST_REPEAT_MODES: RepeatMode[] = ['off', 'one', 'all'];

export const getPlaylistQueueModeLabel = (mode: RehearsalQueueMode) => {
  return mode === 'ordered' ? 'Ordered' : 'Shuffle';
};

export const getPlaylistRepeatModeLabel = (repeatMode: RepeatMode) => {
  if (repeatMode === 'one') {
    return 'Repeat one';
  }

  if (repeatMode === 'all') {
    return 'Repeat all';
  }

  return 'Repeat off';
};

export const getPlaylistPlaybackCurrentItem = (
  session: PlaylistPlaybackSession,
) => {
  return session.queue.items[session.currentIndex] ?? null;
};

export const getPlaylistPlaybackSessionSummary = (
  session: PlaylistPlaybackSession,
) => {
  const itemCount = session.queue.items.length;
  const itemPosition = Math.min(session.currentIndex + 1, itemCount);
  const unavailableItemCount = Math.max(
    0,
    session.requestedItemCount - itemCount,
  );
  const unavailableSummary =
    unavailableItemCount > 0 ? ` • ${unavailableItemCount} unavailable` : '';
  const sessionLabel = session.hasCompleted
    ? 'Finished session'
    : 'Active session';

  return `${sessionLabel} • ${session.playlistName} • item ${itemPosition} of ${itemCount} • ${getPlaylistQueueModeLabel(session.queue.mode)} • ${getPlaylistRepeatModeLabel(session.queue.repeatMode)}${unavailableSummary}.`;
};

export const buildPlaylistPlaybackSession = (
  options: BuildPlaylistPlaybackSessionOptions,
) => {
  if (options.playlist.items.length === 0) {
    return {
      issue: {
        message:
          'Add saved tracks or loops before starting this rehearsal playlist.',
        playlistId: options.playlist.id,
        title: 'Playlist is empty',
      } satisfies PlaylistPlaybackIssue,
      session: null,
    };
  }

  const queue = createPlaybackQueue(
    options.playlist,
    options.loops,
    options.sources,
    {
      mode: options.mode,
      random: options.random,
      repeatMode: options.repeatMode,
    },
  );

  if (queue.items.length === 0) {
    return {
      issue: {
        message:
          'This rehearsal playlist does not currently contain any playable saved tracks or loops.',
        playlistId: options.playlist.id,
        title: 'Playlist has no playable items',
      } satisfies PlaylistPlaybackIssue,
      session: null,
    };
  }

  const startIndex = options.startEntryId
    ? queue.items.findIndex((item) => {
        return item.playlistEntryId === options.startEntryId;
      })
    : 0;

  if (options.startEntryId && startIndex < 0) {
    return {
      issue: {
        message:
          'The selected playlist item is not currently playable. Choose another row or remove the unavailable item from this rehearsal set.',
        playlistId: options.playlist.id,
        title: 'Playlist item unavailable',
      } satisfies PlaylistPlaybackIssue,
      session: null,
    };
  }

  return {
    issue: null,
    session: {
      currentIndex: startIndex,
      hasCompleted: false,
      playlistId: options.playlist.id,
      playlistName: options.playlist.name,
      queue,
      requestedItemCount: options.playlist.items.length,
    } satisfies PlaylistPlaybackSession,
  };
};

export const updatePlaylistPlaybackRepeatMode = (
  session: PlaylistPlaybackSession,
  repeatMode: RepeatMode,
): PlaylistPlaybackSession => {
  return {
    ...session,
    queue: {
      ...session.queue,
      repeatMode,
    },
  };
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

export const resolvePlaylistPlaybackAdvance = (
  session: PlaylistPlaybackSession,
): {
  nextPlayableItem: PlayableItem | null;
  nextSession: PlaylistPlaybackSession;
} => {
  const nextIndex = resolveNextQueueIndex(
    session.currentIndex,
    session.queue.items.length,
    session.queue.repeatMode,
  );

  if (nextIndex === null) {
    return {
      nextPlayableItem: null,
      nextSession: {
        ...session,
        hasCompleted: true,
      },
    };
  }

  return {
    nextPlayableItem: session.queue.items[nextIndex] ?? null,
    nextSession: {
      ...session,
      currentIndex: nextIndex,
      hasCompleted: false,
    },
  };
};

export const resolvePlaylistPlaybackRewind = (
  session: PlaylistPlaybackSession,
): {
  previousPlayableItem: PlayableItem | null;
  previousSession: PlaylistPlaybackSession;
} => {
  const previousIndex = resolvePreviousQueueIndex(
    session.currentIndex,
    session.queue.items.length,
    session.queue.repeatMode,
  );

  if (previousIndex === null) {
    return {
      previousPlayableItem: null,
      previousSession: {
        ...session,
        hasCompleted: false,
      },
    };
  }

  return {
    previousPlayableItem: session.queue.items[previousIndex] ?? null,
    previousSession: {
      ...session,
      currentIndex: previousIndex,
      hasCompleted: false,
    },
  };
};

export const getPlaylistPlaybackActionCopy = (options: {
  activeSession: PlaylistPlaybackSession | null;
  isPreparing: boolean;
  mode: RehearsalQueueMode;
  playbackState: SavedTrackPlaybackState | undefined;
  selectedPlaylist: Playlist | null;
}): PlaylistPlaybackActionCopy => {
  if (!options.selectedPlaylist) {
    return {
      disabled: true,
      label: 'Select playlist',
    };
  }

  if (options.selectedPlaylist.items.length === 0) {
    return {
      disabled: true,
      label: 'Add items first',
    };
  }

  const isActiveMode =
    options.activeSession?.playlistId === options.selectedPlaylist.id &&
    options.activeSession.queue.mode === options.mode;

  if (!isActiveMode) {
    return {
      disabled: options.isPreparing,
      label: getBaseActionLabel(options.mode),
    };
  }

  if (options.isPreparing) {
    return {
      disabled: true,
      label: 'Loading…',
    };
  }

  return {
    disabled: false,
    label: getBaseActionLabel(options.mode),
  };
};
