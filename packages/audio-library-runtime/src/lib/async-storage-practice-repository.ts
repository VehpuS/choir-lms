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
  persistSynchronizedLibraryFileTree,
  readStoredCollection,
  writeStoredCollection,
} from './practice-repository-storage';
import {
  removeLibraryEntitiesFromRepository,
  removeLibraryFileLinksFromRepository,
  removePlaylistEntriesFromRepository,
  saveLibraryNodesToRepository,
  updateLibraryTagsInRepository,
  type LibraryTagChange,
  type RemovedEntityIds,
} from './rehearsal-library-batch-operations';
import { saveSource } from './save-source';
import {
  saveSourceLyricsToRepository,
  type SourceLyricsChange,
} from './source-lyrics-storage';

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

  async saveSource(
    ownerId: string,
    source: DriveAudioSource,
    options?: { fileLink?: RehearsalLibraryFileLinkNode },
  ) {
    return saveSource({
      ...options,
      ownerId,
      repository: this,
      source,
    });
  }

  async deleteSource(ownerId: string, sourceId: string) {
    const sources = await this.listSources(ownerId);
    const loops = await this.listLoops(ownerId);
    const playlists = await this.listPlaylists(ownerId);
    // Adjusted tracks have no audio of their own, so they go with their source
    // the same way its loops do.
    const removedSourceIds = new Set([
      sourceId,
      ...sources
        .filter((source) => source.adjustment?.sourceRef === sourceId)
        .map((source) => source.id),
    ]);
    const nextSources = filter(
      sources,
      (source) => !removedSourceIds.has(source.id),
    );
    const nextLoops = filter(
      loops,
      (loop) => !removedSourceIds.has(loop.sourceId),
    );
    const nextPlaylists = playlists.map((playlist) => {
      return normalizePlaylist({
        ...playlist,
        items: playlist.items.filter(
          (item) => !removedSourceIds.has(item.sourceId),
        ),
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
    }).map((loop) =>
      withResolvedTagAddedAt(loop, loop.tagAddedAt, loop.createdAt),
    );

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
    const nextPlaylists = sortBy([...otherPlaylists, playlistToSave], ['name']);

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
    return this.saveLibraryNodes(ownerId, { folders: [folder] });
  }

  async saveLibraryFileLink(
    ownerId: string,
    fileLink: RehearsalLibraryFileLinkNode,
  ) {
    return this.saveLibraryNodes(ownerId, { fileLinks: [fileLink] });
  }

  /**
   * Validates and applies many folder / link mutations in order against the
   * progressively updated tree, then persists the tree once. Any invalid node
   * throws before anything is written, so a batch is all-or-nothing.
   */
  async saveLibraryNodes(
    ownerId: string,
    nodes: {
      fileLinks?: RehearsalLibraryFileLinkNode[];
      folders?: RehearsalLibraryFolderNode[];
    },
  ) {
    return saveLibraryNodesToRepository(this, ownerId, nodes);
  }

  async removeLibraryFileLinks(ownerId: string, fileLinkIds: string[]) {
    return removeLibraryFileLinksFromRepository(this, ownerId, fileLinkIds);
  }

  async removeLibraryEntities(ownerId: string, entities: RemovedEntityIds) {
    return removeLibraryEntitiesFromRepository(this, ownerId, entities);
  }

  async removePlaylistEntries(
    ownerId: string,
    playlistId: string,
    entryIds: string[],
  ) {
    return removePlaylistEntriesFromRepository(
      this,
      ownerId,
      playlistId,
      entryIds,
    );
  }

  async saveSourceLyrics(
    ownerId: string,
    sourceId: string,
    change: SourceLyricsChange,
  ) {
    return saveSourceLyricsToRepository(this, ownerId, sourceId, change);
  }

  async clearSourceLyrics(ownerId: string, sourceId: string) {
    return saveSourceLyricsToRepository(this, ownerId, sourceId, null);
  }

  async updateLibraryTags(ownerId: string, change: LibraryTagChange) {
    return updateLibraryTagsInRepository(this, ownerId, change);
  }

  async deleteLibraryFileLink(ownerId: string, fileLinkId: string) {
    return deleteLibraryFileLinkFromRepository(this, ownerId, fileLinkId);
  }

  async deleteLibraryFolderNode(ownerId: string, folderId: string) {
    return deleteLibraryFolderNodeFromRepository(this, ownerId, folderId);
  }
}
