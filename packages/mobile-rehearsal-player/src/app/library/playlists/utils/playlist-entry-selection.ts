import type { Playlist } from '@org/audio-library-models';

import type { BulkSelectionItem } from '../../selection/playback-expansion';
import type { SelectionEntry } from '../../selection/selection-model';

// Playlist detail selects by entry, not by track or loop (design Decision 9):
// the same item can appear twice, and removing acts on the occurrence.

type PlaylistEntry = Playlist['items'][number];

export type PlaylistEntrySelectionItem = {
  entityId: string;
  entityKind: 'loop' | 'track';
  entryId: string;
};

export const toPlaylistEntrySelectionEntry = (
  entry: PlaylistEntry,
): SelectionEntry<PlaylistEntrySelectionItem> => ({
  // An entry plays its loop when it has one, otherwise its track.
  item:
    entry.kind === 'loop' && entry.loopId !== undefined
      ? { entityId: entry.loopId, entityKind: 'loop', entryId: entry.id }
      : { entityId: entry.sourceId, entityKind: 'track', entryId: entry.id },
  key: entry.id,
});

export const toPlaylistEntryBulkItem = (
  item: PlaylistEntrySelectionItem,
): BulkSelectionItem => ({
  entityId: item.entityId,
  entityKind: item.entityKind,
  key: item.entryId,
  kind: 'playlist-entry',
});

/** The selection in running order, so playback follows what the user sees. */
export const orderPlaylistEntrySelection = (
  items: readonly PlaylistEntrySelectionItem[],
  entries: readonly PlaylistEntry[],
): PlaylistEntrySelectionItem[] => {
  const position = new Map(entries.map((entry, index) => [entry.id, index]));

  return items
    .filter((item) => position.has(item.entryId))
    .sort(
      (first, second) =>
        (position.get(first.entryId) ?? 0) -
        (position.get(second.entryId) ?? 0),
    );
};

export const getRemoveFromPlaylistConfirmation = (options: {
  count: number;
  playlistName: string;
}) => ({
  confirmLabel: 'Remove from playlist',
  message: `${options.count} ${options.count === 1 ? 'item' : 'items'} will be removed from ${options.playlistName}. The tracks and loops stay in your library.`,
  title: 'Remove from playlist?',
});

export const getRemoveFromPlaylistAcknowledgment = (options: {
  count: number;
  playlistName: string;
}) => ({
  message: `${options.count} ${options.count === 1 ? 'item' : 'items'} removed from ${options.playlistName}.`,
  title: 'Removed from playlist',
});
