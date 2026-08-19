import {
  normalizePlaylist,
  withResolvedTagAddedAt,
  type DriveAudioSource,
  type NamedLoop,
  type Playlist,
  type RehearsalLibraryFileLinkNode,
  type RehearsalLibraryFolderNode,
} from '@org/audio-library-models';
import { filter, sortBy } from 'es-toolkit/compat';

import {
  deleteLibraryFileLinkFromRepository,
  deleteLibraryFolderNodeFromRepository,
  normalizeStoredLoops,
  normalizeStoredSources,
} from './async-storage-practice-repository-helpers';

import type { PracticeRepository } from './practice-repository';
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
  upsertRehearsalLibraryFileLinkNode,
  upsertRehearsalLibraryFolderNode,
} from './rehearsal-library-files';

export class AsyncStoragePracticeRepository implements PracticeRepository {
  async listSources(ownerId: string) {
    const storedSources = await readStoredCollection<DriveAudioSource>(
      'sources',
      ownerId,
    );
    const normalizedSources = normalizeStoredSources(storedSources);

    if (JSON.stringify(storedSources) !== JSON.stringify(normalizedSources)) {
      await writeStoredCollection('sources', ownerId, normalizedSources);
    }

    return normalizedSources;
  }

  async saveSource(ownerId: string, source: DriveAudioSource) {
    const sources = await this.listSources(ownerId);
    const priorSource = sources.find(
      (existingSource) => existingSource.id === source.id,
    );
    const sourceToSave: DriveAudioSource = {
      ...withResolvedTagAddedAt(
        source,
        priorSource?.tagAddedAt,
        new Date().toISOString(),
      ),
      createdAt: priorSource?.createdAt ?? source.createdAt,
    };
    const otherSources = filter(
      sources,
      (existingSource) => existingSource.id !== source.id,
    );
    const nextSources = sortBy([...otherSources, sourceToSave], ['name']);

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
    const playlists = await this.listPlaylists(ownerId);
    const nextSources = filter(sources, (source) => source.id !== sourceId);
    const nextLoops = filter(loops, (loop) => loop.sourceId !== sourceId);
    const nextPlaylists = playlists.map((playlist) => {
      return normalizePlaylist({
        ...playlist,
        items: playlist.items.filter((item) => item.sourceId !== sourceId),
      });
    });

    await writeStoredCollection('loops', ownerId, nextLoops);
    await writeStoredCollection('playlists', ownerId, nextPlaylists);
    await writeStoredCollection('sources', ownerId, nextSources);
    await persistSynchronizedLibraryFileTree(this, ownerId, {
      loops: nextLoops,
      playlists: nextPlaylists,
      sources: nextSources,
    });

    return nextSources;
  }

  async listLoops(ownerId: string) {
    const storedLoops = await readStoredCollection<unknown>('loops', ownerId);
    const normalizedLoops = normalizeStoredLoops({
      loops: storedLoops,
      sources: await this.listSources(ownerId),
    }).map((loop) => withResolvedTagAddedAt(loop, loop.tagAddedAt, loop.createdAt));

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
        'Saved loops must preserve parent-track context through sourceId and sourceName.',
      );
    }

    const loops = await this.listLoops(loop.ownerId);
    const priorLoop = loops.find(
      (existingLoop) => existingLoop.id === normalizedLoop.id,
    );
    const loopToSave: NamedLoop = withResolvedTagAddedAt(
      normalizedLoop,
      priorLoop?.tagAddedAt,
      new Date().toISOString(),
    );
    const otherLoops = filter(
      loops,
      (existingLoop) => existingLoop.id !== loopToSave.id,
    );
    const nextLoops = sortBy([...otherLoops, loopToSave], ['name']);

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
      const normalizedPlaylist = normalizePlaylist(playlist);

      return withResolvedTagAddedAt(
        normalizedPlaylist,
        normalizedPlaylist.tagAddedAt,
        normalizedPlaylist.createdAt,
      );
    });

    if (JSON.stringify(playlists) !== JSON.stringify(normalizedPlaylists)) {
      await writeStoredCollection('playlists', ownerId, normalizedPlaylists);
    }

    return normalizedPlaylists;
  }

  async savePlaylist(playlist: Playlist) {
    const normalizedPlaylist = normalizePlaylist(playlist);
    const playlists = await this.listPlaylists(playlist.ownerId);
    const priorPlaylist = playlists.find(
      (existingPlaylist) => existingPlaylist.id === normalizedPlaylist.id,
    );
    const playlistToSave: Playlist = withResolvedTagAddedAt(
      normalizedPlaylist,
      priorPlaylist?.tagAddedAt,
      new Date().toISOString(),
    );
    const otherPlaylists = filter(
      playlists,
      (existingPlaylist) => existingPlaylist.id !== playlistToSave.id,
    );
    const nextPlaylists = sortBy(
      [...otherPlaylists, playlistToSave],
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

    const priorFolder = tree.folders.find(
      (existingFolder) => existingFolder.id === folder.id,
    );
    const folderToSave: RehearsalLibraryFolderNode = {
      ...withResolvedTagAddedAt(
        folder,
        priorFolder?.tagAddedAt,
        new Date().toISOString(),
      ),
      createdAt: priorFolder?.createdAt ?? folder.createdAt,
    };

    return writeStoredLibraryFileTree(
      ownerId,
      upsertRehearsalLibraryFolderNode(tree, folderToSave),
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
    return deleteLibraryFileLinkFromRepository(this, ownerId, fileLinkId);
  }

  async deleteLibraryFolderNode(ownerId: string, folderId: string) {
    return deleteLibraryFolderNodeFromRepository(this, ownerId, folderId);
  }
}
