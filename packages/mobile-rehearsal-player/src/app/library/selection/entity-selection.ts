import type {
  Playlist,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';
import type { PlacementItem } from '@org/audio-library-runtime';

import type { FilesSelectionItem } from '../saved-rehearsal-library/files-selection';
import { createPlaybackExpansionContext } from './playback-expansion-context';
import type { PlaybackExpansionContext } from './playback-expansion';
import type { SelectionEntry } from './selection-model';

// Selection in the Library views other than Files (Tracks, Loops, Playlists,
// tag detail) addresses a row by its entity (design Decision 9): there is no
// folder link to point at. The items reuse the Files shape so every bulk rule
// (playback expansion, tag targets, removal plans) applies unchanged; the
// entity key stands in for the link id and is never looked up in the tree.

export type EntitySelectionRef = {
  id: string;
  kind: 'folder' | 'loop' | 'playlist' | 'track';
};

export const getEntitySelectionKey = ({ id, kind }: EntitySelectionRef) =>
  `${kind}:${id}`;

export const toEntitySelectionEntry = (
  ref: EntitySelectionRef,
): SelectionEntry<FilesSelectionItem> => {
  const key = getEntitySelectionKey(ref);

  return {
    item:
      ref.kind === 'folder'
        ? { folderId: ref.id, kind: 'folder' }
        : {
            entityId: ref.id,
            entityKind: ref.kind,
            fileLinkId: key,
            kind: 'link',
          },
    key,
  };
};

const getItemKey = (item: FilesSelectionItem) =>
  item.kind === 'folder' ? `folder:${item.folderId}` : item.fileLinkId;

/**
 * The selection in the order the rows are displayed; selected entities that
 * are filtered out of view keep the order they were selected in, after.
 */
export const orderEntitySelection = (
  items: readonly FilesSelectionItem[],
  rows: readonly EntitySelectionRef[],
): FilesSelectionItem[] => {
  const position = new Map(
    rows.map((ref, index) => [getEntitySelectionKey(ref), index]),
  );
  const visible = items
    .filter((item) => position.has(getItemKey(item)))
    .sort(
      (first, second) =>
        (position.get(getItemKey(first)) ?? 0) -
        (position.get(getItemKey(second)) ?? 0),
    );

  return [
    ...visible,
    ...items.filter((item) => !position.has(getItemKey(item))),
  ];
};

/** Only playlists matter: entity views have no folders to expand. */
export const createEntityExpansionContext = (
  playlists: readonly Pick<Playlist, 'id' | 'items'>[],
): PlaybackExpansionContext =>
  createPlaybackExpansionContext({
    playlists,
    tree: { fileLinks: [], folders: [], rootFolderId: '', version: 1 },
  });

/** Keys of every entity that still exists, for pruning a selection. */
export const getValidEntityKeys = (collections: {
  folders: readonly Pick<RehearsalLibraryFolderNode, 'id'>[];
  loops: readonly { id: string }[];
  playlists: readonly { id: string }[];
  sources: readonly { id: string }[];
}): Set<string> =>
  new Set([
    ...collections.folders.map(({ id }) => `folder:${id}`),
    ...collections.loops.map(({ id }) => `loop:${id}`),
    ...collections.playlists.map(({ id }) => `playlist:${id}`),
    ...collections.sources.map(({ id }) => `track:${id}`),
  ]);

/**
 * A copy of an entity view's selection into a folder links each entity there.
 * The links are new, so a synthetic source link carries the entity into the
 * shared copy planner; its id and parent are never used.
 */
export const toEntityPlacementItems = (
  items: readonly FilesSelectionItem[],
  folders: readonly RehearsalLibraryFolderNode[],
): PlacementItem[] =>
  items.flatMap((item): PlacementItem[] => {
    if (item.kind === 'folder') {
      const folder = folders.find(({ id }) => id === item.folderId);

      return folder ? [{ folder, kind: 'folder' }] : [];
    }

    return [
      {
        fileLink: {
          entityId: item.entityId,
          entityKind: item.entityKind,
          id: item.fileLinkId,
          parentFolderId: '',
        },
        kind: 'link',
      },
    ];
  });
