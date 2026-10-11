import type {
  NamedLoop,
  Playlist,
  RehearsalLibraryEntityKind,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';
import type { PlacementItem } from '@org/audio-library-runtime';

import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';
import { createPlaybackExpansionContext } from '../selection/playback-expansion-context';
import type {
  BulkSelectionItem,
  FolderChild,
  PlaybackExpansionContext,
} from '../selection/playback-expansion';
import { collectAncestorIds } from '../selection/partial-rows';
import type { SelectionEntry } from '../selection/selection-model';
import {
  buildLibraryFilesExplorerState,
  getLibraryFilesRowNodeKey,
  type LibraryFilesRow,
  type LibraryFilesSearchOptions,
} from './library-files-model';

// Selection in the Files view addresses a row by its node id (design Decision
// 9): the link id for tracks, loops and playlists (the same entity can be
// reached through two links and move / delete act on links) and the folder id
// for folders. Only the identity is stored, never the row, so every action
// reads the current tree rather than a snapshot taken when the row was tapped.

export type FilesSelectionItem =
  | { folderId: string; kind: 'folder' }
  | {
      entityId: string;
      entityKind: RehearsalLibraryEntityKind;
      fileLinkId: string;
      kind: 'link';
    };

export const getFilesSelectionItemKey = (item: FilesSelectionItem) =>
  item.kind === 'folder' ? item.folderId : item.fileLinkId;

export const toFilesSelectionEntry = (
  row: LibraryFilesRow,
): SelectionEntry<FilesSelectionItem> => {
  const key = getLibraryFilesRowNodeKey(row);

  return {
    item:
      row.kind === 'folder'
        ? { folderId: row.folder.id, kind: 'folder' }
        : {
            entityId: row.fileLink.entityId,
            entityKind: row.fileLink.entityKind,
            fileLinkId: row.fileLink.id,
            kind: 'link',
          },
    key,
  };
};

/** The reduction every playback, playlist and impact rule reads. */
export const toFilesBulkSelectionItem = (
  item: FilesSelectionItem,
): BulkSelectionItem => {
  if (item.kind === 'folder') {
    return { folderId: item.folderId, key: item.folderId, kind: 'folder' };
  }

  if (item.entityKind === 'playlist') {
    return {
      key: item.fileLinkId,
      kind: 'playlist',
      playlistId: item.entityId,
    };
  }

  return {
    entityId: item.entityId,
    key: item.fileLinkId,
    kind: item.entityKind,
  };
};

/**
 * Selected nodes in the order the rows are displayed, so a playback action
 * plays them top to bottom whatever order they were tapped in. Selected nodes
 * that are no longer on screen (another folder, filtered out) keep the order
 * they were selected in, after the visible ones.
 */
export const orderFilesSelectionByRows = (
  items: readonly FilesSelectionItem[],
  rows: readonly LibraryFilesRow[],
): FilesSelectionItem[] => {
  const position = new Map(
    rows.map((row, index) => [getLibraryFilesRowNodeKey(row), index]),
  );
  const visible = items
    .filter((item) => position.has(getFilesSelectionItemKey(item)))
    .sort(
      (first, second) =>
        (position.get(getFilesSelectionItemKey(first)) ?? 0) -
        (position.get(getFilesSelectionItemKey(second)) ?? 0),
    );
  const hidden = items.filter(
    (item) => !position.has(getFilesSelectionItemKey(item)),
  );

  return [...visible, ...hidden];
};

const getParentFolderIdByNodeId = (tree: RehearsalLibraryFileTree) =>
  new Map<string, string | null>([
    ...tree.folders.map(
      (folder) => [folder.id, folder.parentFolderId] as const,
    ),
    ...tree.fileLinks.map((link) => [link.id, link.parentFolderId] as const),
  ]);

/** Folder ids from a node's parent up to the root. */
const getAncestorFolderIds = (
  nodeId: string,
  parentByNodeId: ReadonlyMap<string, string | null>,
): string[] => {
  const ancestors: string[] = [];
  const visited = new Set<string>([nodeId]);
  let parentId = parentByNodeId.get(nodeId) ?? null;

  while (parentId !== null && !visited.has(parentId)) {
    ancestors.push(parentId);
    visited.add(parentId);
    parentId = parentByNodeId.get(parentId) ?? null;
  }

  return ancestors;
};

export type FilesRowSelectionState = {
  /** Rows inside a selected folder: they read as selected and ignore taps. */
  coveredKeys: ReadonlySet<string>;
  /** Folder rows with a selection beneath them that are not selected themselves. */
  partialKeys: ReadonlySet<string>;
};

/**
 * Derived on every render, never stored (design Decision 9, "Partial folder
 * state"): a row is covered when a selected folder is one of its ancestors,
 * and a folder is partial when something selected sits beneath it.
 */
export const getFilesRowSelectionState = (options: {
  items: readonly FilesSelectionItem[];
  rows: readonly LibraryFilesRow[];
  tree: RehearsalLibraryFileTree;
}): FilesRowSelectionState => {
  const parentByNodeId = getParentFolderIdByNodeId(options.tree);
  const selectedKeys = new Set(options.items.map(getFilesSelectionItemKey));
  const selectedFolderIds = new Set(
    options.items.flatMap((item) =>
      item.kind === 'folder' ? [item.folderId] : [],
    ),
  );
  const ancestorIds = collectAncestorIds(
    options.items.map((item) =>
      getAncestorFolderIds(getFilesSelectionItemKey(item), parentByNodeId),
    ),
  );
  const coveredKeys = new Set<string>();
  const partialKeys = new Set<string>();

  for (const row of options.rows) {
    const key = getLibraryFilesRowNodeKey(row);
    const isInsideSelectedFolder = getAncestorFolderIds(
      key,
      parentByNodeId,
    ).some((folderId) => selectedFolderIds.has(folderId));

    if (isInsideSelectedFolder) {
      coveredKeys.add(key);
    } else if (
      row.kind === 'folder' &&
      ancestorIds.has(key) &&
      !selectedKeys.has(key)
    ) {
      partialKeys.add(key);
    }
  }

  return { coveredKeys, partialKeys };
};

/**
 * Tapping a folder selects the whole folder and replaces the items already
 * selected inside it (design: "Partial folder state"), so the count shows the
 * folder alone. Returns the keys to deselect before the folder is selected.
 */
export const getKeysSubsumedByFolder = (options: {
  folderId: string;
  items: readonly FilesSelectionItem[];
  tree: RehearsalLibraryFileTree;
}): string[] => {
  const parentByNodeId = getParentFolderIdByNodeId(options.tree);

  return options.items
    .map(getFilesSelectionItemKey)
    .filter((key) =>
      getAncestorFolderIds(key, parentByNodeId).includes(options.folderId),
    );
};

const toFolderChild = (row: LibraryFilesRow): FolderChild =>
  row.kind === 'folder'
    ? { folderId: row.folder.id, kind: 'folder' }
    : { entityId: row.fileLink.entityId, kind: row.kind };

/**
 * The expansion context over the saved tree, with each folder's children in
 * the order the Files view would list them under the current sort and filters.
 */
export const createFilesPlaybackExpansionContext = (options: {
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
  savedSources: DriveLibrarySource[];
  searchOptions?: LibraryFilesSearchOptions;
  tree: RehearsalLibraryFileTree;
}): PlaybackExpansionContext => {
  // Browsing a folder never applies the text search, which scopes the current
  // listing only, but sort mode and direction carry over.
  const browseOptions = options.searchOptions
    ? { ...options.searchOptions, activeSearchQuery: null }
    : undefined;

  return createPlaybackExpansionContext({
    orderChildren: (folderId) =>
      buildLibraryFilesExplorerState({
        currentFolderId: folderId,
        savedLoops: options.savedLoops,
        savedPlaylists: options.savedPlaylists,
        savedSources: options.savedSources,
        searchOptions: browseOptions,
        tree: options.tree,
      }).rows.map(toFolderChild),
    playlists: options.savedPlaylists,
    tree: options.tree,
  });
};

/**
 * Resolves the selection against the current tree. Nodes that no longer exist
 * are dropped; `missingCount` says how many, so an action can report them.
 */
export const toPlacementItems = (
  items: readonly FilesSelectionItem[],
  tree: RehearsalLibraryFileTree,
): { missingCount: number; placementItems: PlacementItem[] } => {
  const placementItems: PlacementItem[] = [];

  for (const item of items) {
    if (item.kind === 'folder') {
      const folder = tree.folders.find(({ id }) => id === item.folderId);

      if (folder) {
        placementItems.push({ folder, kind: 'folder' });
      }

      continue;
    }

    const fileLink = tree.fileLinks.find(({ id }) => id === item.fileLinkId);

    if (fileLink) {
      placementItems.push({ fileLink, kind: 'link' });
    }
  }

  return {
    missingCount: items.length - placementItems.length,
    placementItems,
  };
};

/** The entities behind the selected nodes, each once, for a tag change. */
export const toFilesTagTargets = (
  items: readonly FilesSelectionItem[],
): { id: string; kind: 'folder' | 'loop' | 'playlist' | 'track' }[] => {
  const targets = new Map<
    string,
    { id: string; kind: 'folder' | 'loop' | 'playlist' | 'track' }
  >();

  for (const item of items) {
    const target =
      item.kind === 'folder'
        ? { id: item.folderId, kind: 'folder' as const }
        : { id: item.entityId, kind: item.entityKind };

    targets.set(`${target.kind}:${target.id}`, target);
  }

  return [...targets.values()];
};
