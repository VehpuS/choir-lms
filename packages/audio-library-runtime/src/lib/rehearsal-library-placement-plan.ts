import type {
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import {
  collectDescendantFolderIds,
  normalizeRehearsalLibraryNodeName,
  resolveRehearsalLibraryAvailableNodeName,
  resolveRehearsalLibraryFileLinkName,
  resolveSiblingNodeNames,
} from './rehearsal-library-file-guards';
import type { RehearsalLibraryEntityCollections } from './rehearsal-library-files';

export type PlacementMode = 'copy' | 'move';

export type PlacementItem =
  | { fileLink: RehearsalLibraryFileLinkNode; kind: 'link' }
  | { folder: RehearsalLibraryFolderNode; kind: 'folder' };

export type PlacementInvalidReason =
  | 'folder-copy-unsupported'
  | 'folder-into-itself';

export type PlacementPlanEntry = {
  invalidReason?: PlacementInvalidReason;
  item: PlacementItem;
  itemId: string;
  name: string;
  /** `ready` places as-is, `conflict` needs keep-both or skip, `invalid` can never be placed. */
  status: 'conflict' | 'invalid' | 'ready';
  /** The unique `Copy` proposal for a conflict. */
  suggestedName?: string;
};

export type PlacementResolution = 'keep-both' | 'skip';

const getItemId = (item: PlacementItem) =>
  item.kind === 'link' ? item.fileLink.id : item.folder.id;

/**
 * One pass over a copy / move selection: every destination-name conflict and
 * every invalid target is found up front, so the caller shows one list
 * instead of a dialog per item. Conflicts are checked against the
 * destination's current children and against earlier items in the same batch
 * (two selected `Verse` tracks cannot both land under that name).
 */
export const planRehearsalLibraryPlacement = (options: {
  destinationFolderId: string;
  entityCollections: RehearsalLibraryEntityCollections;
  items: readonly PlacementItem[];
  mode: PlacementMode;
  tree: RehearsalLibraryFileTree;
}): PlacementPlanEntry[] => {
  const { destinationFolderId, entityCollections, items, mode, tree } = options;
  const reservedNames = resolveSiblingNodeNames({
    entityCollections,
    parentFolderId: destinationFolderId,
    tree,
  });
  const taken = new Map<string, number>();
  const take = (name: string) => {
    const key = normalizeRehearsalLibraryNodeName(name);

    taken.set(key, (taken.get(key) ?? 0) + 1);
  };
  const isTaken = (name: string) => {
    return (taken.get(normalizeRehearsalLibraryNodeName(name)) ?? 0) > 0;
  };

  for (const name of reservedNames) {
    take(name);
  }

  return items.map((item): PlacementPlanEntry => {
    const itemId = getItemId(item);
    const name =
      item.kind === 'link'
        ? resolveRehearsalLibraryFileLinkName({
            entityCollections,
            fileLink: item.fileLink,
          })
        : item.folder.name;

    if (item.kind === 'folder' && mode === 'copy') {
      return {
        invalidReason: 'folder-copy-unsupported',
        item,
        itemId,
        name,
        status: 'invalid',
      };
    }

    if (
      item.kind === 'folder' &&
      (destinationFolderId === item.folder.id ||
        collectDescendantFolderIds(tree, item.folder.id).has(
          destinationFolderId,
        ))
    ) {
      return {
        invalidReason: 'folder-into-itself',
        item,
        itemId,
        name,
        status: 'invalid',
      };
    }

    const isAlreadyHere =
      mode === 'move' &&
      (item.kind === 'link'
        ? item.fileLink.parentFolderId
        : item.folder.parentFolderId) === destinationFolderId;

    // A move within the same folder keeps the item's own name; its name is
    // already counted among the destination's children.
    if (isAlreadyHere || !isTaken(name)) {
      if (!isAlreadyHere) {
        take(name);
      }

      return { item, itemId, name, status: 'ready' };
    }

    const suggestedName = resolveRehearsalLibraryAvailableNodeName({
      forceCopy: true,
      reservedNames: [...taken.keys()],
      sourceName: name,
    });

    take(suggestedName);

    return { item, itemId, name, status: 'conflict', suggestedName };
  });
};

/**
 * Turns a plan plus the user's per-conflict choices into the nodes to save in
 * one batch. Invalid entries are never placed; a conflict with no choice is
 * skipped rather than guessed.
 */
export const buildPlacementNodes = (options: {
  createLinkId: (fileLink: RehearsalLibraryFileLinkNode) => string;
  destinationFolderId: string;
  mode: PlacementMode;
  plan: readonly PlacementPlanEntry[];
  resolutions: Readonly<Record<string, PlacementResolution>>;
}): {
  fileLinks: RehearsalLibraryFileLinkNode[];
  folders: RehearsalLibraryFolderNode[];
  skippedCount: number;
} => {
  const fileLinks: RehearsalLibraryFileLinkNode[] = [];
  const folders: RehearsalLibraryFolderNode[] = [];
  let skippedCount = 0;

  for (const entry of options.plan) {
    const resolution = options.resolutions[entry.itemId];

    if (
      entry.status === 'invalid' ||
      (entry.status === 'conflict' && resolution !== 'keep-both')
    ) {
      skippedCount += 1;
      continue;
    }

    const renamed =
      entry.status === 'conflict' ? entry.suggestedName : undefined;

    if (entry.item.kind === 'folder') {
      folders.push({
        ...entry.item.folder,
        name: renamed ?? entry.item.folder.name,
        parentFolderId: options.destinationFolderId,
      });
      continue;
    }

    const { fileLink } = entry.item;

    fileLinks.push({
      ...fileLink,
      ...(options.mode === 'copy'
        ? { id: options.createLinkId(fileLink) }
        : {}),
      ...(renamed ? { visibleName: renamed } : {}),
      parentFolderId: options.destinationFolderId,
    });
  }

  return { fileLinks, folders, skippedCount };
};
