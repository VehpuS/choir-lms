import type {
  CompositeTrack,
  DriveAudioSource,
  NamedLoop,
  Playlist,
  RehearsalLibraryEntityKind,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import { updateStoredComposites } from './composites-storage';
import type { PracticeRepository } from './practice-repository';
import {
  persistSynchronizedLibraryFileTree,
  readStoredCollection,
  writeStoredCollection,
  writeStoredLibraryFileTree,
} from './practice-repository-storage';
import { createRehearsalLibraryDefaultFileLinkNode } from './rehearsal-library-files';

/**
 * Bulk writes for an import (library-share-import spec). Saving entities one
 * at a time would re-read every collection per entity and give each new entity
 * a default root link; these write each collection once and the tree once, so
 * an imported item only ever sits in its import folder.
 */

export type ImportedEntities = {
  sources?: DriveAudioSource[];
  loops?: NamedLoop[];
  playlists?: Playlist[];
  composites?: CompositeTrack[];
};

export type ImportedTreeNodes = {
  folders: RehearsalLibraryFolderNode[];
  fileLinks: RehearsalLibraryFileLinkNode[];
  /** Entities the import owns; their default root link is dropped once linked. */
  ownedEntities: { kind: RehearsalLibraryEntityKind; id: string }[];
};

const upsertById = <Item extends { id: string }>(
  stored: Item[],
  incoming: readonly Item[],
): Item[] => {
  const incomingIds = new Set(incoming.map((item) => item.id));

  return [...stored.filter((item) => !incomingIds.has(item.id)), ...incoming];
};

export const importLibraryEntities = async (
  ownerId: string,
  entities: ImportedEntities,
) => {
  if (entities.sources?.length) {
    const stored = await readStoredCollection<DriveAudioSource>(
      'sources',
      ownerId,
    );

    await writeStoredCollection(
      'sources',
      ownerId,
      upsertById(stored, entities.sources).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
  }

  if (entities.loops?.length) {
    const stored = await readStoredCollection<NamedLoop>('loops', ownerId);

    await writeStoredCollection(
      'loops',
      ownerId,
      upsertById(stored, entities.loops),
    );
  }

  if (entities.playlists?.length) {
    const stored = await readStoredCollection<Playlist>('playlists', ownerId);

    await writeStoredCollection(
      'playlists',
      ownerId,
      upsertById(stored, entities.playlists),
    );
  }

  if (entities.composites?.length) {
    const incoming = entities.composites;

    await updateStoredComposites(ownerId, (stored) =>
      upsertById(stored, incoming),
    );
  }
};

export const importLibraryTreeNodes = async (
  repository: Pick<
    PracticeRepository,
    'listComposites' | 'listLoops' | 'listPlaylists' | 'listSources'
  >,
  ownerId: string,
  nodes: ImportedTreeNodes,
): Promise<RehearsalLibraryFileTree> => {
  // The sync adds a default root link for each new entity; the import links
  // replace those, so drop them for the entities the import owns.
  const tree = await persistSynchronizedLibraryFileTree(repository, ownerId);
  const importedKeys = new Set(
    nodes.fileLinks.map((link) => `${link.entityKind}:${link.entityId}`),
  );
  const ownedDefaultLinkIds = new Set(
    nodes.ownedEntities
      .filter(({ kind, id }) => importedKeys.has(`${kind}:${id}`))
      .map(
        ({ kind, id }) =>
          createRehearsalLibraryDefaultFileLinkNode(kind, id).id,
      ),
  );
  const next: RehearsalLibraryFileTree = {
    ...tree,
    folders: upsertById(tree.folders, nodes.folders),
    fileLinks: upsertById(
      tree.fileLinks.filter((link) => !ownedDefaultLinkIds.has(link.id)),
      nodes.fileLinks,
    ),
  };

  return writeStoredLibraryFileTree(ownerId, next);
};
