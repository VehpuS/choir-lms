import type {
  DriveAudioSource,
  RehearsalLibraryFileLinkNode,
} from '@org/audio-library-models';
import { filter, sortBy } from 'es-toolkit/compat';

import { resolveSourceForSave } from './async-storage-practice-repository-helpers';
import type { PracticeRepository } from './practice-repository';
import {
  persistSynchronizedLibraryFileTree,
  writeStoredCollection,
  writeStoredLibraryFileTree,
} from './practice-repository-storage';
import {
  assertValidRehearsalLibraryFileLinkMutation,
  upsertRehearsalLibraryFileLinkNode,
} from './rehearsal-library-files';

type SourceSaveRepository = Pick<
  PracticeRepository,
  'listLibraryFileTree' | 'listLoops' | 'listPlaylists' | 'listSources'
>;

export const saveSource = async (options: {
  fileLink?: RehearsalLibraryFileLinkNode;
  ownerId: string;
  repository: SourceSaveRepository;
  source: DriveAudioSource;
}) => {
  const sources = await options.repository.listSources(options.ownerId);
  const priorSource = sources.find(
    (existingSource) => existingSource.id === options.source.id,
  );
  const sourceToSave = resolveSourceForSave({
    priorSource,
    savedAt: new Date().toISOString(),
    source: options.source,
  });
  const otherSources = filter(
    sources,
    (existingSource) => existingSource.id !== options.source.id,
  );
  const nextSources = sortBy([...otherSources, sourceToSave], ['name']);
  const entityCollections = {
    loops: await options.repository.listLoops(options.ownerId),
    playlists: await options.repository.listPlaylists(options.ownerId),
    sources: nextSources,
  };

  const fileLink = options.fileLink;

  if (!fileLink) {
    await writeStoredCollection('sources', options.ownerId, nextSources);
    await persistSynchronizedLibraryFileTree(
      options.repository,
      options.ownerId,
      entityCollections,
    );
    return nextSources;
  }

  if (
    fileLink.entityKind !== 'track' ||
    fileLink.entityId !== options.source.id
  ) {
    throw new Error('The Library file link must reference the saved source.');
  }

  const tree = await options.repository.listLibraryFileTree(options.ownerId);

  if (!tree.folders.some((folder) => folder.id === fileLink.parentFolderId)) {
    throw new Error(
      `The parent folder "${fileLink.parentFolderId}" does not exist.`,
    );
  }

  assertValidRehearsalLibraryFileLinkMutation({
    tree,
    entityCollections,
    fileLink,
  });
  const nextTree = upsertRehearsalLibraryFileLinkNode(tree, fileLink);

  await writeStoredCollection('sources', options.ownerId, nextSources);
  await writeStoredLibraryFileTree(options.ownerId, nextTree);

  return nextSources;
};
