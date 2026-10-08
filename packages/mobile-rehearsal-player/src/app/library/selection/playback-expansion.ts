// Containers expand only for the playback and playlist actions (design
// Decision 10): `Play next`, `Add to queue`, `Add to playlist` and `Save as
// playlist` are about the audio the user wants to hear. Every other bulk
// action acts on the selected nodes themselves.

/** One selected row, reduced to what bulk actions need. `key` is the selection identity. */
export type BulkSelectionItem =
  | { folderId: string; key: string; kind: 'folder' }
  | { entityId: string; key: string; kind: 'track' | 'loop' }
  | { key: string; kind: 'playlist'; playlistId: string }
  // A playlist-detail entry: the occurrence itself, not the track or loop.
  | {
      entityId: string;
      entityKind: 'track' | 'loop';
      key: string;
      kind: 'playlist-entry';
    };

export type PlaybackRef = {
  entityId: string;
  kind: 'track' | 'loop';
};

/** A folder's child in the Files view's current display order. */
export type FolderChild =
  | { folderId: string; kind: 'folder' }
  | { entityId: string; kind: 'track' | 'loop' | 'playlist' };

export type PlaybackExpansionContext = {
  /** The folder's children in the order the Files view currently sorts them. */
  getFolderChildren: (folderId: string) => readonly FolderChild[];
  /** A playlist's entries in playlist order. */
  getPlaylistRefs: (playlistId: string) => readonly PlaybackRef[];
};

export type PlaybackExpansion = {
  /** Selected folders and playlists that contributed nothing. */
  emptyContainerCount: number;
  refs: PlaybackRef[];
};

// Depth-first in display order. Playlist links inside a folder are skipped:
// the spec expands folders into their tracks and loops only.
const collectFolderRefs = (
  folderId: string,
  context: PlaybackExpansionContext,
  visitedFolderIds: Set<string>,
): PlaybackRef[] => {
  if (visitedFolderIds.has(folderId)) {
    return [];
  }

  visitedFolderIds.add(folderId);

  return context.getFolderChildren(folderId).flatMap((child) => {
    if (child.kind === 'folder') {
      return collectFolderRefs(child.folderId, context, visitedFolderIds);
    }

    return child.kind === 'playlist'
      ? []
      : [{ entityId: child.entityId, kind: child.kind }];
  });
};

const expandItem = (
  item: BulkSelectionItem,
  context: PlaybackExpansionContext,
): { isContainer: boolean; refs: PlaybackRef[] } => {
  switch (item.kind) {
    case 'folder':
      return {
        isContainer: true,
        refs: collectFolderRefs(item.folderId, context, new Set()),
      };
    case 'playlist':
      return {
        isContainer: true,
        refs: [...context.getPlaylistRefs(item.playlistId)],
      };
    case 'playlist-entry':
      return {
        isContainer: false,
        refs: [{ entityId: item.entityId, kind: item.entityKind }],
      };
    case 'track':
    case 'loop':
      return {
        isContainer: false,
        refs: [{ entityId: item.entityId, kind: item.kind }],
      };
  }
};

/**
 * The effective items for a playback or playlist action, applied in the order
 * the selection is displayed (callers pass `items` in display order). Repeats
 * are kept: a track selected directly and again through a folder plays twice,
 * as queueing it twice would.
 */
export const expandSelectionForPlayback = (
  items: readonly BulkSelectionItem[],
  context: PlaybackExpansionContext,
): PlaybackExpansion => {
  const expansions = items.map((item) => expandItem(item, context));

  return {
    emptyContainerCount: expansions.filter(
      ({ isContainer, refs }) => isContainer && refs.length === 0,
    ).length,
    refs: expansions.flatMap(({ refs }) => refs),
  };
};

/**
 * `Add to playlist` must not offer a playlist that is itself in the selection:
 * adding a playlist's entries to itself would double it.
 */
export const getBlockedPlaylistTargetIds = (
  items: readonly BulkSelectionItem[],
): Set<string> =>
  new Set(
    items.flatMap((item) =>
      item.kind === 'playlist' ? [item.playlistId] : [],
    ),
  );
