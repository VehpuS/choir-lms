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

export type PlaylistsInFoldersChoice = 'include' | 'skip';
export type RepeatedItemsChoice = 'keep' | 'remove';

export type PlaybackExpansionOptions = {
  /** `include` expands a folder's playlist links at their display position. */
  playlists: PlaylistsInFoldersChoice;
  /** `remove` keeps only the first occurrence of each track or loop. */
  repeats: RepeatedItemsChoice;
};

/** The behavior before the user is asked: playlist links skipped, repeats kept. */
export const DEFAULT_EXPANSION_OPTIONS: PlaybackExpansionOptions = {
  playlists: 'skip',
  repeats: 'keep',
};

export type PlaybackExpansion = {
  /** Selected folders and playlists that contributed nothing. */
  emptyContainerCount: number;
  /** Playlist links met inside selected folders, whether or not included. */
  playlistLinkCount: number;
  refs: PlaybackRef[];
  /** Items `repeats: 'remove'` would drop (or did drop) from the result. */
  repeatCount: number;
};

type ItemExpansion = {
  isContainer: boolean;
  playlistLinkCount: number;
  refs: PlaybackRef[];
};

// Depth-first in display order. A playlist link is expanded through the
// playlist's own entries only when asked; entries are tracks and loops, so
// playlists never recurse.
const collectFolderExpansion = (
  folderId: string,
  context: PlaybackExpansionContext,
  options: PlaybackExpansionOptions,
  visitedFolderIds: Set<string>,
): { playlistLinkCount: number; refs: PlaybackRef[] } => {
  if (visitedFolderIds.has(folderId)) {
    return { playlistLinkCount: 0, refs: [] };
  }

  visitedFolderIds.add(folderId);

  let playlistLinkCount = 0;
  const refs: PlaybackRef[] = [];

  for (const child of context.getFolderChildren(folderId)) {
    if (child.kind === 'folder') {
      const nested = collectFolderExpansion(
        child.folderId,
        context,
        options,
        visitedFolderIds,
      );

      playlistLinkCount += nested.playlistLinkCount;
      refs.push(...nested.refs);
    } else if (child.kind === 'playlist') {
      playlistLinkCount += 1;

      if (options.playlists === 'include') {
        refs.push(...context.getPlaylistRefs(child.entityId));
      }
    } else {
      refs.push({ entityId: child.entityId, kind: child.kind });
    }
  }

  return { playlistLinkCount, refs };
};

const expandItem = (
  item: BulkSelectionItem,
  context: PlaybackExpansionContext,
  options: PlaybackExpansionOptions,
): ItemExpansion => {
  switch (item.kind) {
    case 'folder':
      return {
        isContainer: true,
        ...collectFolderExpansion(item.folderId, context, options, new Set()),
      };
    case 'playlist':
      return {
        isContainer: true,
        playlistLinkCount: 0,
        refs: [...context.getPlaylistRefs(item.playlistId)],
      };
    case 'playlist-entry':
      return {
        isContainer: false,
        playlistLinkCount: 0,
        refs: [{ entityId: item.entityId, kind: item.entityKind }],
      };
    case 'track':
    case 'loop':
      return {
        isContainer: false,
        playlistLinkCount: 0,
        refs: [{ entityId: item.entityId, kind: item.kind }],
      };
  }
};

const getRefKey = ({ entityId, kind }: PlaybackRef) => `${kind}:${entityId}`;

const dropRepeats = (refs: readonly PlaybackRef[]): PlaybackRef[] => {
  const seen = new Set<string>();

  return refs.filter((ref) => {
    const key = getRefKey(ref);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

/**
 * The effective items for a playback or playlist action, applied in the order
 * the selection is displayed (callers pass `items` in display order). By
 * default repeats are kept and folders' playlist links skipped; the user's
 * answers (9.5.1) arrive as `options`. The counts are reported either way so a
 * surface can tell whether a question is due.
 */
export const expandSelectionForPlayback = (
  items: readonly BulkSelectionItem[],
  context: PlaybackExpansionContext,
  options: PlaybackExpansionOptions = DEFAULT_EXPANSION_OPTIONS,
): PlaybackExpansion => {
  const expansions = items.map((item) => expandItem(item, context, options));
  const allRefs = expansions.flatMap(({ refs }) => refs);
  const dedupedRefs = dropRepeats(allRefs);

  return {
    emptyContainerCount: expansions.filter(
      ({ isContainer, refs }) => isContainer && refs.length === 0,
    ).length,
    playlistLinkCount: expansions.reduce(
      (total, { playlistLinkCount }) => total + playlistLinkCount,
      0,
    ),
    refs: options.repeats === 'remove' ? dedupedRefs : allRefs,
    repeatCount: allRefs.length - dedupedRefs.length,
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
