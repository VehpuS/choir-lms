import type { RehearsalLibraryFileTree } from '@org/audio-library-models';

import type { FilesSelectionItem } from './files-selection';

// Pure planning for the Files bulk actions that act on the selected nodes
// themselves (design Decision 10): what a delete or a removal would touch, so
// one aggregated confirmation can say so before anything is written.

const collectSubtreeFolderIds = (
  tree: RehearsalLibraryFileTree,
  folderId: string,
): Set<string> => {
  const ids = new Set<string>([folderId]);
  let didGrow = true;

  while (didGrow) {
    didGrow = false;

    for (const folder of tree.folders) {
      if (
        folder.parentFolderId !== null &&
        ids.has(folder.parentFolderId) &&
        !ids.has(folder.id)
      ) {
        ids.add(folder.id);
        didGrow = true;
      }
    }
  }

  return ids;
};

export type BulkDeleteFromFolderPlan = {
  /** Every link that goes: the selected links plus those inside selected folders. */
  fileLinkIds: string[];
  /** Folders removed, selected ones and everything nested in them. */
  folderCount: number;
  /** Selected folders that are not inside another selected folder, deepest-last. */
  topFolderIds: string[];
  /** Items that lose their last link and so leave the library (counted once each). */
  lastLinkCount: number;
  lastLinkLoopCount: number;
  lastLinkPlaylistCount: number;
  lastLinkTrackCount: number;
  linkCount: number;
  /** Selected folders and links, as the user sees them. */
  selectedFolderCount: number;
  selectedLinkCount: number;
};

export const planBulkDeleteFromFolder = (
  items: readonly FilesSelectionItem[],
  tree: RehearsalLibraryFileTree,
): BulkDeleteFromFolderPlan => {
  const selectedFolderIds = items.flatMap((item) =>
    item.kind === 'folder' && item.folderId !== tree.rootFolderId
      ? [item.folderId]
      : [],
  );
  // A folder nested in another selected folder goes with that one.
  const subtrees = selectedFolderIds.map((folderId) => ({
    folderId,
    ids: collectSubtreeFolderIds(tree, folderId),
  }));
  const topFolderIds = subtrees
    .filter(
      ({ folderId }) =>
        !subtrees.some(
          (other) => other.folderId !== folderId && other.ids.has(folderId),
        ),
    )
    .map(({ folderId }) => folderId);
  const removedFolderIds = new Set(
    subtrees
      .filter(({ folderId }) => topFolderIds.includes(folderId))
      .flatMap(({ ids }) => [...ids]),
  );
  const selectedLinkIds = new Set(
    items.flatMap((item) => (item.kind === 'link' ? [item.fileLinkId] : [])),
  );
  const removedLinks = tree.fileLinks.filter(
    ({ id, parentFolderId }) =>
      selectedLinkIds.has(id) || removedFolderIds.has(parentFolderId),
  );
  const removedIds = new Set(removedLinks.map(({ id }) => id));
  const remainingKeys = new Set(
    tree.fileLinks
      .filter(({ id }) => !removedIds.has(id))
      .map(({ entityId, entityKind }) => `${entityKind}:${entityId}`),
  );
  // One entry per item that loses its last link, however many of its links go.
  const lastLinks = [
    ...new Map(
      removedLinks
        .filter(
          ({ entityId, entityKind }) =>
            !remainingKeys.has(`${entityKind}:${entityId}`),
        )
        .map((link) => [`${link.entityKind}:${link.entityId}`, link]),
    ).values(),
  ];
  const countKind = (kind: 'loop' | 'playlist' | 'track') =>
    lastLinks.filter(({ entityKind }) => entityKind === kind).length;

  return {
    fileLinkIds: removedLinks.map(({ id }) => id),
    folderCount: removedFolderIds.size,
    lastLinkCount: lastLinks.length,
    lastLinkLoopCount: countKind('loop'),
    lastLinkPlaylistCount: countKind('playlist'),
    lastLinkTrackCount: countKind('track'),
    linkCount: removedLinks.length,
    selectedFolderCount: selectedFolderIds.length,
    selectedLinkCount: selectedLinkIds.size,
    topFolderIds,
  };
};

export type BulkRemoveFromLibraryPlan = {
  /** Selected folders, which `Remove from library` leaves out. */
  excludedFolderCount: number;
  loopIds: string[];
  playlistIds: string[];
  sourceIds: string[];
};

/** Distinct entities behind the selected links; folders are left out. */
export const planBulkRemoveFromLibrary = (
  items: readonly FilesSelectionItem[],
): BulkRemoveFromLibraryPlan => {
  const idsOfKind = (kind: 'loop' | 'playlist' | 'track') => [
    ...new Set(
      items.flatMap((item) =>
        item.kind === 'link' && item.entityKind === kind ? [item.entityId] : [],
      ),
    ),
  ];

  return {
    excludedFolderCount: items.filter(({ kind }) => kind === 'folder').length,
    loopIds: idsOfKind('loop'),
    playlistIds: idsOfKind('playlist'),
    sourceIds: idsOfKind('track'),
  };
};
