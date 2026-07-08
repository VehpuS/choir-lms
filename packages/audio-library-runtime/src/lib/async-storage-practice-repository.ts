import {
  isNamedLoop,
  normalizePlaylist,
  type DriveAudioSource,
  type NamedLoop,
  type Playlist,
  type RehearsalLibraryFileLinkNode,
  type RehearsalLibraryFileTree,
  type RehearsalLibraryFolderNode,
} from '@org/audio-library-models';
import { filter, sortBy } from 'es-toolkit/compat';

import {
  hasCanonicalEntity,
  loadCanonicalCollections,
  persistSynchronizedLibraryFileTree,
  readStoredCollection,
  writeStoredCollection,
  writeStoredLibraryFileTree,
} from './practice-repository-storage';
import {
  assertValidRehearsalLibraryFileLinkMutation,
  assertValidRehearsalLibraryFolderMutation,
  REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
  removeRehearsalLibraryFileLinkNode,
  upsertRehearsalLibraryFileLinkNode,
  upsertRehearsalLibraryFolderNode,
} from './rehearsal-library-files';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const hasNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

const normalizeStoredLoop = (options: {
  loop: unknown;
  sourceNameById: ReadonlyMap<string, string>;
}): NamedLoop | null => {
  if (!isRecord(options.loop) || !hasNonEmptyString(options.loop.sourceId)) {
    return null;
  }

  const sourceName =
    options.sourceNameById.get(options.loop.sourceId) ??
    (hasNonEmptyString(options.loop.sourceName)
      ? options.loop.sourceName
      : null);

  if (!sourceName) {
    return null;
  }

  const normalizedLoop = {
    ...options.loop,
    sourceId: options.loop.sourceId,
    sourceName,
  };

  return isNamedLoop(normalizedLoop) ? normalizedLoop : null;
};

const normalizeStoredLoops = (options: {
  loops: unknown[];
  sources: DriveAudioSource[];
}) => {
  const sourceNameById = new Map(
    options.sources.map((source) => {
      return [source.id, source.name] as const;
    }),
  );

  return options.loops.flatMap((loop) => {
    const normalizedLoop = normalizeStoredLoop({
      loop,
      sourceNameById,
    });

    return normalizedLoop ? [normalizedLoop] : [];
  });
};

export type PracticeRepository = {
  listSources(ownerId: string): Promise<DriveAudioSource[]>;
  saveSource(
    ownerId: string,
    source: DriveAudioSource,
  ): Promise<DriveAudioSource[]>;
  deleteSource(ownerId: string, sourceId: string): Promise<DriveAudioSource[]>;
  listLoops(ownerId: string): Promise<NamedLoop[]>;
  saveLoop(loop: NamedLoop): Promise<NamedLoop[]>;
  deleteLoop(ownerId: string, loopId: string): Promise<NamedLoop[]>;
  listPlaylists(ownerId: string): Promise<Playlist[]>;
  savePlaylist(playlist: Playlist): Promise<Playlist[]>;
  deletePlaylist(ownerId: string, playlistId: string): Promise<Playlist[]>;
  listLibraryFileTree(ownerId: string): Promise<RehearsalLibraryFileTree>;
  saveLibraryFolderNode(
    ownerId: string,
    folder: RehearsalLibraryFolderNode,
  ): Promise<RehearsalLibraryFileTree>;
  saveLibraryFileLink(
    ownerId: string,
    fileLink: RehearsalLibraryFileLinkNode,
  ): Promise<RehearsalLibraryFileTree>;
  deleteLibraryFileLink(
    ownerId: string,
    fileLinkId: string,
  ): Promise<RehearsalLibraryFileTree>;
};

export class AsyncStoragePracticeRepository implements PracticeRepository {
  async listSources(ownerId: string) {
    return readStoredCollection<DriveAudioSource>('sources', ownerId);
  }

  async saveSource(ownerId: string, source: DriveAudioSource) {
    const sources = await this.listSources(ownerId);
    const otherSources = filter(
      sources,
      (existingSource) => existingSource.id !== source.id,
    );
    const nextSources = sortBy([...otherSources, source], ['name']);

    await writeStoredCollection('sources', ownerId, nextSources);
    await persistSynchronizedLibraryFileTree(this, ownerId, {
      loops: await this.listLoops(ownerId),
      playlists: await this.listPlaylists(ownerId),
      sources: nextSources,
    });

    return nextSources;
  }

  async deleteSource(ownerId: string, sourceId: string) {
    const sources = await this.listSources(ownerId);
    const loops = await this.listLoops(ownerId);
    const nextSources = filter(sources, (source) => source.id !== sourceId);
    const nextLoops = filter(loops, (loop) => loop.sourceId !== sourceId);

    await writeStoredCollection('loops', ownerId, nextLoops);
    await writeStoredCollection('sources', ownerId, nextSources);
    await persistSynchronizedLibraryFileTree(this, ownerId, {
      loops: nextLoops,
      playlists: await this.listPlaylists(ownerId),
      sources: nextSources,
    });

    return nextSources;
  }

  async listLoops(ownerId: string) {
    const storedLoops = await readStoredCollection<unknown>('loops', ownerId);
    const normalizedLoops = normalizeStoredLoops({
      loops: storedLoops,
      sources: await this.listSources(ownerId),
    });

    if (JSON.stringify(storedLoops) !== JSON.stringify(normalizedLoops)) {
      await writeStoredCollection('loops', ownerId, normalizedLoops);
    }

    return normalizedLoops;
  }

  async saveLoop(loop: NamedLoop) {
    const normalizedLoop = normalizeStoredLoops({
      loops: [loop],
      sources: await this.listSources(loop.ownerId),
    })[0];

    if (!normalizedLoop) {
      throw new Error(
        'Saved loops must preserve parent-track provenance through sourceId and sourceName.',
      );
    }

    const loops = await this.listLoops(loop.ownerId);
    const otherLoops = filter(
      loops,
      (existingLoop) => existingLoop.id !== normalizedLoop.id,
    );
    const nextLoops = sortBy([...otherLoops, normalizedLoop], ['name']);

    await writeStoredCollection('loops', loop.ownerId, nextLoops);
    await persistSynchronizedLibraryFileTree(this, loop.ownerId, {
      loops: nextLoops,
      playlists: await this.listPlaylists(loop.ownerId),
      sources: await this.listSources(loop.ownerId),
    });

    return nextLoops;
  }

  async deleteLoop(ownerId: string, loopId: string) {
    const loops = await this.listLoops(ownerId);
    const nextLoops = filter(loops, (loop) => loop.id !== loopId);

    await writeStoredCollection('loops', ownerId, nextLoops);
    await persistSynchronizedLibraryFileTree(this, ownerId, {
      loops: nextLoops,
      playlists: await this.listPlaylists(ownerId),
      sources: await this.listSources(ownerId),
    });

    return nextLoops;
  }

  async listPlaylists(ownerId: string) {
    const playlists = await readStoredCollection<Playlist>(
      'playlists',
      ownerId,
    );
    const normalizedPlaylists = playlists.map((playlist) => {
      return normalizePlaylist(playlist);
    });

    if (JSON.stringify(playlists) !== JSON.stringify(normalizedPlaylists)) {
      await writeStoredCollection('playlists', ownerId, normalizedPlaylists);
    }

    return normalizedPlaylists;
  }

  async savePlaylist(playlist: Playlist) {
    const normalizedPlaylist = normalizePlaylist(playlist);
    const playlists = await this.listPlaylists(playlist.ownerId);
    const otherPlaylists = filter(
      playlists,
      (existingPlaylist) => existingPlaylist.id !== normalizedPlaylist.id,
    );
    const nextPlaylists = sortBy(
      [...otherPlaylists, normalizedPlaylist],
      ['name'],
    );

    await writeStoredCollection(
      'playlists',
      normalizedPlaylist.ownerId,
      nextPlaylists,
    );
    await persistSynchronizedLibraryFileTree(this, normalizedPlaylist.ownerId, {
      loops: await this.listLoops(normalizedPlaylist.ownerId),
      playlists: nextPlaylists,
      sources: await this.listSources(normalizedPlaylist.ownerId),
    });

    return nextPlaylists;
  }

  async deletePlaylist(ownerId: string, playlistId: string) {
    const playlists = await this.listPlaylists(ownerId);
    const nextPlaylists = filter(
      playlists,
      (playlist) => playlist.id !== playlistId,
    );

    await writeStoredCollection('playlists', ownerId, nextPlaylists);
    await persistSynchronizedLibraryFileTree(this, ownerId, {
      loops: await this.listLoops(ownerId),
      playlists: nextPlaylists,
      sources: await this.listSources(ownerId),
    });

    return nextPlaylists;
  }

  async listLibraryFileTree(ownerId: string) {
    return persistSynchronizedLibraryFileTree(this, ownerId);
  }

  async saveLibraryFolderNode(
    ownerId: string,
    folder: RehearsalLibraryFolderNode,
  ) {
    if (folder.id === REHEARSAL_LIBRARY_ROOT_FOLDER_ID) {
      throw new Error('The root library folder cannot be mutated.');
    }

    if (folder.parentFolderId === null) {
      throw new Error(
        'Non-root library folders must reference a parent folder.',
      );
    }

    const entityCollections = await loadCanonicalCollections(this, ownerId);
    const tree = await persistSynchronizedLibraryFileTree(
      this,
      ownerId,
      entityCollections,
    );

    if (
      !tree.folders.some(
        (existingFolder) => existingFolder.id === folder.parentFolderId,
      )
    ) {
      throw new Error(
        `The parent folder "${folder.parentFolderId}" does not exist.`,
      );
    }

    assertValidRehearsalLibraryFolderMutation({
      tree,
      entityCollections,
      folder,
    });

    return writeStoredLibraryFileTree(
      ownerId,
      upsertRehearsalLibraryFolderNode(tree, folder),
    );
  }

  async saveLibraryFileLink(
    ownerId: string,
    fileLink: RehearsalLibraryFileLinkNode,
  ) {
    const entityCollections = await loadCanonicalCollections(this, ownerId);
    const tree = await persistSynchronizedLibraryFileTree(
      this,
      ownerId,
      entityCollections,
    );

    if (!tree.folders.some((folder) => folder.id === fileLink.parentFolderId)) {
      throw new Error(
        `The parent folder "${fileLink.parentFolderId}" does not exist.`,
      );
    }

    if (!hasCanonicalEntity(entityCollections, fileLink)) {
      throw new Error(
        `The ${fileLink.entityKind} entity "${fileLink.entityId}" is not available in the saved library.`,
      );
    }

    assertValidRehearsalLibraryFileLinkMutation({
      tree,
      entityCollections,
      fileLink,
    });

    return writeStoredLibraryFileTree(ownerId, {
      ...tree,
      fileLinks: upsertRehearsalLibraryFileLinkNode(tree, fileLink).fileLinks,
    });
  }

  async deleteLibraryFileLink(ownerId: string, fileLinkId: string) {
    const tree = await this.listLibraryFileTree(ownerId);
    const fileLink = tree.fileLinks.find(
      (existingFileLink) => existingFileLink.id === fileLinkId,
    );

    if (!fileLink) {
      return tree;
    }

    const hasAdditionalLinks = tree.fileLinks.some((existingFileLink) => {
      return (
        existingFileLink.id !== fileLinkId &&
        existingFileLink.entityKind === fileLink.entityKind &&
        existingFileLink.entityId === fileLink.entityId
      );
    });

    if (hasAdditionalLinks) {
      return writeStoredLibraryFileTree(
        ownerId,
        removeRehearsalLibraryFileLinkNode(tree, fileLinkId),
      );
    }

    if (fileLink.entityKind === 'track') {
      await this.deleteSource(ownerId, fileLink.entityId);
    } else if (fileLink.entityKind === 'loop') {
      await this.deleteLoop(ownerId, fileLink.entityId);
    } else {
      await this.deletePlaylist(ownerId, fileLink.entityId);
    }

    return this.listLibraryFileTree(ownerId);
  }
}
