import type {
  DriveAudioSource,
  NamedLoop,
  PlayableItem,
} from '@org/audio-library-models';

import {
  resolvePlaybackRefsToPlayableItems,
  type PlaybackItemsResolution,
} from './playback-items';
import {
  expandSelectionForPlayback,
  type BulkSelectionItem,
  type PlaybackExpansionContext,
  type PlaybackExpansionOptions,
  type PlaybackRef,
} from './playback-expansion';

export type BulkPlaybackActionId =
  | 'add-to-playlist'
  | 'add-to-queue'
  | 'play-next'
  | 'save-as-playlist';

export type BulkAcknowledgment = {
  /** Opens a folder from the acknowledgment (the destination of a move). */
  action?: { folderId: string; label: string };
  message: string;
  title: string;
  /** Reverses a non-destructive batch change (design 9.0: copy and move). */
  undo?: { label: string; run: () => Promise<void> | void };
};

export type PreparedBulkPlayback = {
  playableItems: PlayableItem[];
  refs: PlaybackRef[];
  /** Effective items that cannot play (missing, or no playable audio). */
  unavailableCount: number;
};

/**
 * The effective items for a playback action after the user's choices (9.5.1),
 * as playable items in order. Playlist actions read `refs` instead, because
 * they store entries rather than play them.
 */
export const prepareBulkPlayback = (options: {
  collections: { loops: NamedLoop[]; sources: DriveAudioSource[] };
  context: PlaybackExpansionContext;
  expansionOptions: PlaybackExpansionOptions;
  items: readonly BulkSelectionItem[];
}): PreparedBulkPlayback => {
  const { refs } = expandSelectionForPlayback(
    options.items,
    options.context,
    options.expansionOptions,
  );
  const resolution: PlaybackItemsResolution =
    resolvePlaybackRefsToPlayableItems(refs, options.collections);

  return {
    playableItems: resolution.playableItems,
    refs,
    unavailableCount: resolution.unavailableCount,
  };
};

const formatItemCount = (count: number) =>
  `${count} ${count === 1 ? 'item' : 'items'}`;

const formatLeftOut = (count: number) =>
  count === 0 ? '' : ` ${formatItemCount(count)} could not be used.`;

const NOTHING_USABLE_MESSAGE = 'None of the selected items can play right now.';

export const getNothingPlayableAcknowledgment = (): BulkAcknowledgment => ({
  message: NOTHING_USABLE_MESSAGE,
  title: 'Nothing to add',
});

/** What the completion acknowledgment says for each bulk playback action. */
export const getBulkPlaybackAcknowledgment = (options: {
  action: BulkPlaybackActionId;
  count: number;
  leftOutCount: number;
  playlistName?: string;
}): BulkAcknowledgment => {
  const items = formatItemCount(options.count);
  const leftOut = formatLeftOut(options.leftOutCount);

  switch (options.action) {
    case 'play-next':
      return {
        message: `${items} will play next, in order.${leftOut}`,
        title: 'Playing next',
      };
    case 'add-to-queue':
      return {
        message: `${items} added to the end of the queue.${leftOut}`,
        title: 'Added to queue',
      };
    case 'add-to-playlist':
      return {
        message: `${items} added to ${options.playlistName ?? 'the playlist'}.${leftOut}`,
        title: 'Added to playlist',
      };
    case 'save-as-playlist':
      return {
        message: `${options.playlistName ?? 'The playlist'} has ${items}.${leftOut}`,
        title: 'Playlist created',
      };
  }
};
