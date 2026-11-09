import {
  type CompositeTrack,
  type DriveAudioSource,
  type ImportedFrom,
  type LibraryBundle,
  type NamedLoop,
  type Playlist,
  type RehearsalLibraryEntityKind,
  type RehearsalLibraryFileLinkNode,
  type RehearsalLibraryFileTree,
  type RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import {
  resolveRehearsalLibraryAvailableNodeName,
  resolveSiblingNodeNames,
} from './rehearsal-library-file-guards.ts';
import type { RehearsalLibraryEntityCollections } from './rehearsal-library-files.ts';
import { planImportedSources } from './library-bundle-import-sources.ts';

/**
 * Plans an additive import (design Decision 7): pure over the bundle and the
 * current library, so the preview and the apply step share one answer. Every
 * created id is derived from `importId`, so planning again after a partial
 * failure yields the same ids and entities already written are skipped
 * instead of duplicated.
 */

export type LibraryBundleImportOptions = {
  bundle: LibraryBundle;
  /** The bundle's file name, recorded in `importedFrom`. */
  bundleName: string;
  destinationFolderId: string;
  /** Stable for one import attempt and its retries. */
  importId: string;
  importedAt: string;
  ownerId: string;
  state: {
    entityCollections: RehearsalLibraryEntityCollections;
    tree: RehearsalLibraryFileTree;
  };
  /** Drive files the probe could not open; their tracks import as `needs-access`. */
  needsAccessDriveFileIds?: ReadonlySet<string>;
};

export type LibraryBundleImportSummary = {
  newTracks: number;
  reusedTracks: number;
  /** Tracks whose file the user cannot open yet. */
  needsAccessTracks: number;
  loops: number;
  playlists: number;
  composites: number;
  folders: number;
  /** Entities a previous attempt already wrote. */
  alreadyImported: number;
};

export type LibraryBundleImportPlan = {
  importedFrom: ImportedFrom;
  rootFolder: RehearsalLibraryFolderNode;
  /** True on a retry that finds the root folder already written. */
  rootFolderExists: boolean;
  folders: RehearsalLibraryFolderNode[];
  /** New tracks, adjusted tracks included, in write order (originals first). */
  newSources: DriveAudioSource[];
  /**
   * Every entity this import owns, whether or not a previous attempt already
   * wrote it: the executor drops the default root link of exactly these once
   * their import link is in place.
   */
  ownedEntities: { kind: RehearsalLibraryEntityKind; id: string }[];
  /** Existing tracks that gain tags or fill empty content. */
  updatedSources: DriveAudioSource[];
  loops: NamedLoop[];
  playlists: Playlist[];
  composites: CompositeTrack[];
  fileLinks: RehearsalLibraryFileLinkNode[];
  summary: LibraryBundleImportSummary;
};

const IMPORT_ROOT_PREFIX = 'Imported';
const DATE_LENGTH = 10;

const hasId = (items: readonly { id: string }[]) => {
  const ids = new Set(items.map((item) => item.id));

  return (id: string) => ids.has(id);
};

/** Hands out names unique within one parent, so two imported siblings never collide. */
const createNameAllocator = () => {
  const taken = new Map<string, string[]>();

  return (parentId: string, name: string) => {
    const reserved = taken.get(parentId) ?? [];
    const allocated = resolveRehearsalLibraryAvailableNodeName({
      reservedNames: reserved,
      sourceName: name,
    });

    taken.set(parentId, [...reserved, allocated]);

    return allocated;
  };
};

export const planLibraryBundleImport = (
  options: LibraryBundleImportOptions,
): LibraryBundleImportPlan => {
  const { bundle, importId, importedAt, state } = options;
  const { entityCollections, tree } = state;
  const importedFrom: ImportedFrom = {
    author: bundle.author.name,
    ...(bundle.author.email ? { authorEmail: bundle.author.email } : {}),
    bundleName: options.bundleName,
    importedAt,
  };
  const key = `import:${importId}`;
  const sourceExists = hasId(entityCollections.sources);
  const loopExists = hasId(entityCollections.loops);
  const playlistExists = hasId(entityCollections.playlists);
  const compositeExists = hasId(entityCollections.composites);
  const folderExists = hasId(tree.folders);
  const linkExists = hasId(tree.fileLinks);
  let alreadyImported = 0;
  const skipIfPresent = <Item extends { id: string }>(
    items: Item[],
    exists: (id: string) => boolean,
  ) => {
    const fresh = items.filter((item) => !exists(item.id));

    alreadyImported += items.length - fresh.length;

    return fresh;
  };

  const {
    sourceIds,
    newSources,
    ownedExistingIds,
    updatedSources,
    reusedTracks,
    needsAccessTracks,
  } = planImportedSources({
    bundleSources: bundle.sources,
    existingSources: entityCollections.sources,
    importedFrom,
    importKey: key,
    needsAccessDriveFileIds: options.needsAccessDriveFileIds,
  });

  // Everything else is always new, with ids derived from the import.
  const loopIds = new Map(
    bundle.loops.map((loop) => [loop.id, `loop:${key}:${loop.id}`]),
  );
  const compositeIds = new Map(
    bundle.composites.map((composite) => [
      composite.id,
      `composite:${key}:${composite.id}`,
    ]),
  );
  const playlistIds = new Map(
    bundle.playlists.map((playlist) => [
      playlist.id,
      `playlist:${key}:${playlist.id}`,
    ]),
  );
  const mapped = (ids: ReadonlyMap<string, string>, id: string) =>
    ids.get(id) ?? id;

  const loops: NamedLoop[] = bundle.loops.map((loop) => ({
    ...loop,
    id: mapped(loopIds, loop.id),
    sourceId: mapped(sourceIds, loop.sourceId),
    ownerId: options.ownerId,
    importedFrom,
  }));
  const composites: CompositeTrack[] = bundle.composites.map((composite) => ({
    ...composite,
    id: mapped(compositeIds, composite.id),
    stems: composite.stems.map((stem) => ({
      ...stem,
      trackId: mapped(sourceIds, stem.trackId),
    })),
    importedFrom,
  }));
  const playlists: Playlist[] = bundle.playlists.map((playlist) => {
    const playlistId = mapped(playlistIds, playlist.id);

    return {
      ...playlist,
      id: playlistId,
      ownerId: options.ownerId,
      importedFrom,
      items: playlist.items.map((entry) => ({
        ...entry,
        id: `${playlistId}:${entry.id}`,
        playlistId,
        sourceId:
          entry.kind === 'composite'
            ? mapped(compositeIds, entry.sourceId)
            : mapped(sourceIds, entry.sourceId),
        ...(entry.loopId !== undefined
          ? { loopId: mapped(loopIds, entry.loopId) }
          : {}),
      })),
    };
  });

  // Tree: a fresh root folder named by the placement rules, the bundle's tree beneath it.
  const rootFolderId = `folder:${key}`;
  const baseName = `${IMPORT_ROOT_PREFIX} ${
    bundle.scope.kind === 'folder' ? bundle.scope.name : 'library'
  } ${importedAt.slice(0, DATE_LENGTH)}`;
  const existingRoot = tree.folders.find(
    (folder) => folder.id === rootFolderId,
  );
  const rootFolder: RehearsalLibraryFolderNode = existingRoot ?? {
    id: rootFolderId,
    name: resolveRehearsalLibraryAvailableNodeName({
      reservedNames: resolveSiblingNodeNames({
        entityCollections,
        parentFolderId: options.destinationFolderId,
        tree,
      }),
      sourceName: baseName,
    }),
    parentFolderId: options.destinationFolderId,
    importedFrom,
    createdAt: importedAt,
  };
  const folderIds = new Map(
    bundle.folders.map((folder) => [folder.id, `folder:${key}:${folder.id}`]),
  );
  const allocateName = createNameAllocator();
  const parentFolderId = (bundleParent: string | null) =>
    bundleParent === null ? rootFolderId : mapped(folderIds, bundleParent);
  const folders: RehearsalLibraryFolderNode[] = bundle.folders.map(
    (folder) => ({
      id: mapped(folderIds, folder.id),
      name: allocateName(parentFolderId(folder.parentFolderId), folder.name),
      parentFolderId: parentFolderId(folder.parentFolderId),
      ...(folder.tags ? { tags: folder.tags } : {}),
      ...(folder.tagAddedAt ? { tagAddedAt: folder.tagAddedAt } : {}),
      importedFrom,
      createdAt: importedAt,
    }),
  );

  const nameOf = (kind: string, id: string) => {
    const lookups: Record<string, readonly { id: string; name: string }[]> = {
      track: bundle.sources,
      loop: bundle.loops,
      playlist: bundle.playlists,
      composite: bundle.composites,
    };

    return lookups[kind]?.find((item) => item.id === id)?.name ?? id;
  };
  const entityIdsByKind: Record<string, ReadonlyMap<string, string>> = {
    track: sourceIds,
    loop: loopIds,
    playlist: playlistIds,
    composite: compositeIds,
  };
  const fileLinks: RehearsalLibraryFileLinkNode[] = bundle.fileLinks.map(
    (link) => {
      const parent = parentFolderId(link.parentFolderId);
      const wanted = link.visibleName ?? nameOf(link.entityKind, link.entityId);
      const name = allocateName(parent, wanted);

      return {
        id: `file-link:${key}:${link.id}`,
        parentFolderId: parent,
        entityKind: link.entityKind,
        entityId: mapped(
          entityIdsByKind[link.entityKind] ?? new Map(),
          link.entityId,
        ),
        ...(name !== wanted || link.visibleName ? { visibleName: name } : {}),
      };
    },
  );

  const plan: LibraryBundleImportPlan = {
    importedFrom,
    rootFolder,
    rootFolderExists: existingRoot !== undefined,
    folders: skipIfPresent(folders, folderExists),
    newSources: skipIfPresent(newSources, sourceExists),
    ownedEntities: [
      ...[...newSources.map((source) => source.id), ...ownedExistingIds].map(
        (id) => ({ kind: 'track' as const, id }),
      ),
      ...loops.map(({ id }) => ({ kind: 'loop' as const, id })),
      ...playlists.map(({ id }) => ({ kind: 'playlist' as const, id })),
      ...composites.map(({ id }) => ({ kind: 'composite' as const, id })),
    ],
    updatedSources,
    loops: skipIfPresent(loops, loopExists),
    playlists: skipIfPresent(playlists, playlistExists),
    composites: skipIfPresent(composites, compositeExists),
    fileLinks: skipIfPresent(fileLinks, linkExists),
    summary: {
      newTracks: newSources.length,
      reusedTracks,
      needsAccessTracks,
      loops: loops.length,
      playlists: playlists.length,
      composites: composites.length,
      folders: folders.length + 1,
      alreadyImported: 0,
    },
  };

  plan.summary.alreadyImported = alreadyImported + ownedExistingIds.length;

  return plan;
};
