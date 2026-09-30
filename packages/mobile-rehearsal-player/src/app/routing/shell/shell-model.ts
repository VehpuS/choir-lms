import type { PlayableItem } from '@org/audio-library-models';

import type { SavedTrackPlaybackState } from '../../library/playback/utils/saved-track-playback-view-model';
import {
  canUpdateQueuePlaylist,
  getPlaylistPlaybackSessionSummary,
  resolvePlaylistPlaybackAdvance,
  type PlaylistPlaybackSession,
} from '../../library/playlists/utils/saved-playlist-playback-view-model';
import {
  getPlayableItemLoopRange,
  getPlaybackCollectionLabel,
  getPlaybackProgressRatio,
  getPlaybackStatusLabel,
  getProgressLabel,
  getQueueItemDetail,
  getQueueSessionMetaLabel,
} from './shell-playback-summary-model';

export {
  getMiniPlayerSummary,
  getPlaybackProgressRatio,
  type MiniPlayerSummary,
} from './shell-playback-summary-model';

export type ShellDestinationKey = 'recents' | 'add' | 'library';

export type ShellDestination = {
  key: ShellDestinationKey;
  label: string;
};

export type NowPlayingSurfaceSummary = {
  collectionLabel: string;
  playbackLabel: string;
  loopRange: ReturnType<typeof getPlayableItemLoopRange>;
  progressLabel: string;
  statusLabel: string;
  supportsQueueNavigation: boolean;
  title: string;
  upNextLabel: string | null;
  waveformProgressRatio: number;
};

export type UpNextSurfaceItem = {
  detail: string;
  isCurrent: boolean;
  key: string;
  title: string;
};

export type UpNextSurfaceSummary = {
  items: UpNextSurfaceItem[];
  /** `9 items · 32:14 · ordered · repeat all` (1h). */
  metaLabel: string;
  queuePlaylistActions: {
    saveLabel: string;
    updateAction: {
      confirmLabel: string;
      confirmationMessage: string;
      confirmationTitle: string;
      label: string;
    } | null;
  } | null;
  title: string;
};

export const SHELL_DESTINATIONS: ShellDestination[] = [
  { key: 'library', label: 'Library' },
  { key: 'add', label: 'Add' },
  { key: 'recents', label: 'Recents' },
];

export const getNowPlayingSurfaceSummary = (options: {
  activePlayableItem: PlayableItem | null;
  activePlaylistSession?: PlaylistPlaybackSession | null;
  isPlaybackPreparing: boolean;
  playbackPositionSeconds: number;
  playbackState: SavedTrackPlaybackState | undefined;
}): NowPlayingSurfaceSummary | null => {
  if (!options.activePlayableItem) {
    return null;
  }

  return {
    title: options.activePlayableItem.title,
    statusLabel: getPlaybackStatusLabel(options),
    progressLabel: getProgressLabel({
      activePlayableItem: options.activePlayableItem,
      playbackPositionSeconds: options.playbackPositionSeconds,
    }),
    collectionLabel: getPlaybackCollectionLabel({
      activePlayableItem: options.activePlayableItem,
      activePlaylistSession: options.activePlaylistSession,
    }),
    playbackLabel: options.activePlaylistSession
      ? getPlaylistPlaybackSessionSummary(options.activePlaylistSession)
      : 'Keep the current rehearsal item audible while moving between Library, Add, and Recents.',
    loopRange: getPlayableItemLoopRange(options.activePlayableItem),
    supportsQueueNavigation: Boolean(options.activePlaylistSession),
    upNextLabel: options.activePlaylistSession
      ? (resolvePlaylistPlaybackAdvance(options.activePlaylistSession)
          .nextPlayableItem?.title ?? null)
      : null,
    waveformProgressRatio: getPlaybackProgressRatio({
      activePlayableItem: options.activePlayableItem,
      playbackPositionSeconds: options.playbackPositionSeconds,
    }),
  };
};

export const getUpNextSurfaceSummary = (options: {
  activePlaylistSession?: PlaylistPlaybackSession | null;
}): UpNextSurfaceSummary | null => {
  if (!options.activePlaylistSession) {
    return null;
  }

  const updateAction = canUpdateQueuePlaylist(options.activePlaylistSession)
    ? {
        confirmLabel: 'Update playlist',
        confirmationMessage: `Replace the saved items and order in ${options.activePlaylistSession.playlistName} with the current Up Next order. Unsaved queued tracks will be added to Library first, and current playback keeps running.`,
        confirmationTitle: `Update ${options.activePlaylistSession.playlistName}?`,
        label: `Update ${options.activePlaylistSession.playlistName}`,
      }
    : null;

  return {
    metaLabel: getQueueSessionMetaLabel(options.activePlaylistSession),
    queuePlaylistActions: {
      // With a playlist to update, saving is the alternative (1h); without
      // one, it is the only way to keep the queue.
      saveLabel: updateAction ? 'Save as new' : 'Save as playlist',
      updateAction,
    },
    title: options.activePlaylistSession.playlistName,
    items: options.activePlaylistSession.queue.items.map((item, index) => {
      return {
        title: item.title,
        detail: getQueueItemDetail(item),
        isCurrent: index === options.activePlaylistSession?.currentIndex,
        key: item.playlistEntryId ?? `${item.id}:${index}`,
      };
    }),
  };
};
