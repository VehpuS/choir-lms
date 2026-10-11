import {
  normalizeLibraryEntityTags,
  normalizePlaylist,
  withResolvedTagAddedAt,
  type DriveAudioSource,
  type NamedLoop,
  type Playlist,
  type RehearsalLibraryFileLinkNode,
  type RehearsalLibraryFileTree,
  type RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import {
  applyRehearsalLibraryFileLinkMutation,
  applyRehearsalLibraryFolderMutation,
} from './rehearsal-library-node-mutations';
import {
  loadCanonicalCollections,
  persistSynchronizedLibraryFileTree,
  writeStoredCollection,
  writeStoredLibraryFileTree,
} from './practice-repository-storage';
import {
  syncRehearsalLibraryFileTree,
  type RehearsalLibraryEntityCollections,
} from './rehearsal-library-files';

// The batched variants compute the next library state once and persist it
// once (design Decision 10): a reload never shows half an action. Each takes
// the repository only for its list/save reads.
type BatchRepository = {
  listLoops(ownerId: string): Promise<NamedLoop[]>;
  listPlaylists(ownerId: string): Promise<Playlist[]>;
  listSources(ownerId: string): Promise<DriveAudioSource[]>;
  savePlaylist(playlist: Playlist): Promise<Playlist[]>;
};

export type RemovedEntityIds = {
  loopIds?: readonly string[];
  playlistIds?: readonly string[];
  sourceIds?: readonly string[];
};

export type LibraryTagTarget = {
  id: string;
  kind: 'folder' | 'loop' | 'playlist' | 'track';
};

export type LibraryTagChange = {
  /** Tags to add to every target (case-insensitive duplicates collapse). */
  add?: readonly string[];
  /** Tags to clear from every target; other tags are untouched. */
  remove?: readonly string[];
  targets: readonly LibraryTagTarget[];
};

export type LibraryRemovalResult = {
  collections: RehearsalLibraryEntityCollections;
  tree: RehearsalLibraryFileTree;
};

export const saveLibraryNodesToRepository = async (
  repository: BatchRepository,
  ownerId: string,
  nodes: {
    fileLinks?: RehearsalLibraryFileLinkNode[];
    folders?: RehearsalLibraryFolderNode[];
  },
) => {
  const entityCollections = await loadCanonicalCollections(repository, ownerId);
  let tree = await persistSynchronizedLibraryFileTree(
    repository,
    ownerId,
    entityCollections,
  );

  for (const folder of nodes.folders ?? []) {
    tree = applyRehearsalLibraryFolderMutation({
      entityCollections,
      folder,
      tree,
    });
  }

  for (const fileLink of nodes.fileLinks ?? []) {
    tree = applyRehearsalLibraryFileLinkMutation({
      entityCollections,
      fileLink,
      tree,
    });
  }

  return writeStoredLibraryFileTree(ownerId, tree);
};

const removeEntities = async (
  repository: BatchRepository,
  ownerId: string,
  options: {
    entities: RemovedEntityIds;
    removedFileLinkIds?: ReadonlySet<string>;
  },
): Promise<LibraryRemovalResult> => {
  const before = await loadCanonicalCollections(repository, ownerId);
  const tree = await persistSynchronizedLibraryFileTree(
    repository,
    ownerId,
    before,
  );
  // Adjusted tracks have no audio of their own, so they go with their source
  // the same way its loops do (matches `deleteSource`).
  const removedSourceIds = new Set([
    ...(options.entities.sourceIds ?? []),
    ...before.sources
      .filter((source) => {
        return (options.entities.sourceIds ?? []).includes(
          source.adjustment?.sourceRef ?? '',
        );
      })
      .map(({ id }) => id),
  ]);
  const removedLoopIds = new Set(options.entities.loopIds ?? []);
  const removedPlaylistIds = new Set(options.entities.playlistIds ?? []);
  const next: RehearsalLibraryEntityCollections = {
    loops: before.loops.filter((loop) => {
      return (
        !removedLoopIds.has(loop.id) && !removedSourceIds.has(loop.sourceId)
      );
    }),
    playlists: before.playlists
      .filter((playlist) => !removedPlaylistIds.has(playlist.id))
      .map((playlist) => {
        const items = playlist.items.filter((item) => {
          return !removedSourceIds.has(item.sourceId);
        });

        return items.length === playlist.items.length
          ? playlist
          : normalizePlaylist({ ...playlist, items });
      }),
    sources: before.sources.filter((source) => {
      return !removedSourceIds.has(source.id);
    }),
  };

  await writeStoredCollection('loops', ownerId, next.loops);
  await writeStoredCollection('playlists', ownerId, next.playlists);
  await writeStoredCollection('sources', ownerId, next.sources);

  const prunedTree = options.removedFileLinkIds
    ? {
        ...tree,
        fileLinks: tree.fileLinks.filter((fileLink) => {
          return !options.removedFileLinkIds?.has(fileLink.id);
        }),
      }
    : tree;
  const nextTree = await writeStoredLibraryFileTree(
    ownerId,
    syncRehearsalLibraryFileTree({
      entityCollections: next,
      existingTree: prunedTree,
    }),
  );

  return { collections: next, tree: nextTree };
};

/** `Remove from library`: entities go with every link, loop and playlist entry. */
export const removeLibraryEntitiesFromRepository = (
  repository: BatchRepository,
  ownerId: string,
  entities: RemovedEntityIds,
) => removeEntities(repository, ownerId, { entities });

/**
 * `Delete from folder`: removes the links; an entity whose last link goes is
 * removed with its cascade, exactly as deleting that one link would.
 */
export const removeLibraryFileLinksFromRepository = async (
  repository: BatchRepository,
  ownerId: string,
  fileLinkIds: readonly string[],
) => {
  const tree = await persistSynchronizedLibraryFileTree(repository, ownerId);
  const removedFileLinkIds = new Set(fileLinkIds);
  const remainingEntityKeys = new Set(
    tree.fileLinks
      .filter((fileLink) => !removedFileLinkIds.has(fileLink.id))
      .map((fileLink) => `${fileLink.entityKind}:${fileLink.entityId}`),
  );
  const lastLinkEntities = tree.fileLinks.filter((fileLink) => {
    return (
      removedFileLinkIds.has(fileLink.id) &&
      !remainingEntityKeys.has(`${fileLink.entityKind}:${fileLink.entityId}`)
    );
  });
  const idsOfKind = (kind: 'track' | 'loop' | 'playlist') => [
    ...new Set(
      lastLinkEntities
        .filter((fileLink) => fileLink.entityKind === kind)
        .map((fileLink) => fileLink.entityId),
    ),
  ];

  return removeEntities(repository, ownerId, {
    entities: {
      loopIds: idsOfKind('loop'),
      playlistIds: idsOfKind('playlist'),
      sourceIds: idsOfKind('track'),
    },
    removedFileLinkIds,
  });
};

export const removePlaylistEntriesFromRepository = async (
  repository: BatchRepository,
  ownerId: string,
  playlistId: string,
  entryIds: readonly string[],
) => {
  const playlists = await repository.listPlaylists(ownerId);
  const playlist = playlists.find(({ id }) => id === playlistId);

  if (!playlist) {
    throw new Error(`The playlist "${playlistId}" does not exist.`);
  }

  const removedEntryIds = new Set(entryIds);

  return repository.savePlaylist(
    normalizePlaylist({
      ...playlist,
      items: playlist.items.filter((item) => !removedEntryIds.has(item.id)),
      updatedAt: new Date().toISOString(),
    }),
  );
};

const applyTagChange = <
  Node extends { tagAddedAt?: Record<string, string>; tags?: string[] },
>(
  node: Node,
  change: LibraryTagChange,
  now: string,
): Node => {
  const removedKeys = new Set(
    (change.remove ?? []).map((tag) => tag.trim().toLocaleLowerCase()),
  );
  const tags = normalizeLibraryEntityTags([
    ...(node.tags ?? []).filter((tag) => {
      return !removedKeys.has(tag.toLocaleLowerCase());
    }),
    ...(change.add ?? []),
  ]);

  return withResolvedTagAddedAt({ ...node, tags }, node.tagAddedAt, now);
};

/** Bulk tag add / remove, persisted once; untouched tags stay as they are. */
export const updateLibraryTagsInRepository = async (
  repository: BatchRepository,
  ownerId: string,
  change: LibraryTagChange,
) => {
  const before = await loadCanonicalCollections(repository, ownerId);
  const tree = await persistSynchronizedLibraryFileTree(
    repository,
    ownerId,
    before,
  );
  const now = new Date().toISOString();
  const targetKeys = new Set(
    change.targets.map(({ id, kind }) => `${kind}:${id}`),
  );
  const isTarget = (kind: LibraryTagTarget['kind'], id: string) => {
    return targetKeys.has(`${kind}:${id}`);
  };
  const next: RehearsalLibraryEntityCollections = {
    loops: before.loops.map((loop) => {
      return isTarget('loop', loop.id)
        ? applyTagChange(loop, change, now)
        : loop;
    }),
    playlists: before.playlists.map((playlist) => {
      return isTarget('playlist', playlist.id)
        ? applyTagChange(playlist, change, now)
        : playlist;
    }),
    sources: before.sources.map((source) => {
      return isTarget('track', source.id)
        ? applyTagChange(source, change, now)
        : source;
    }),
  };

  await writeStoredCollection('loops', ownerId, next.loops);
  await writeStoredCollection('playlists', ownerId, next.playlists);
  await writeStoredCollection('sources', ownerId, next.sources);

  return writeStoredLibraryFileTree(
    ownerId,
    syncRehearsalLibraryFileTree({
      entityCollections: next,
      existingTree: {
        ...tree,
        folders: tree.folders.map((folder) => {
          return isTarget('folder', folder.id)
            ? applyTagChange(folder, change, now)
            : folder;
        }),
      },
    }),
  );
};
