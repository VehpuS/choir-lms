import {
  type DriveAudioSource,
  type NamedLoop,
  type Playlist,
  type RehearsalLibraryFileLinkNode,
  type RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import {
  deleteLibraryFileLinkFromRepository,
  deleteLibraryFolderNodeFromRepository,
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
import {
  deleteLoopFromRepository,
  deletePlaylistFromRepository,
  listLoopsFromRepository,
  listPlaylistsFromRepository,
  saveLoopToRepository,
  savePlaylistToRepository,
} from './loop-playlist-storage';
import { deleteSourceFromRepository } from './delete-source-from-repository';
import { saveSource } from './save-source';
import {
  saveSourceLyricsToRepository,
  type SourceLyricsChange,
} from './source-lyrics-storage';
import {
  addMarkerToRepository,
  deleteMarkerFromRepository,
  moveMarkerInRepository,
  renameMarkerInRepository,
  type MarkerAddition,
} from './source-markers-storage';
import {
  addSheetMusicSourceToRepository,
  removeSheetMusicSourceFromRepository,
  updateSheetMusicSourceInRepository,
  type SheetMusicAddition,
  type SheetMusicChange,
} from './source-sheet-music-storage';

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
    return deleteSourceFromRepository(this, ownerId, sourceId);
  }

  async listLoops(ownerId: string): Promise<NamedLoop[]> {
    return listLoopsFromRepository(this, ownerId);
  }

  async saveLoop(loop: NamedLoop) {
    return saveLoopToRepository(this, loop);
  }

  async deleteLoop(ownerId: string, loopId: string) {
    return deleteLoopFromRepository(this, ownerId, loopId);
  }

  async listPlaylists(ownerId: string) {
    return listPlaylistsFromRepository(ownerId);
  }

  async savePlaylist(playlist: Playlist) {
    return savePlaylistToRepository(this, playlist);
  }

  async deletePlaylist(ownerId: string, playlistId: string) {
    return deletePlaylistFromRepository(this, ownerId, playlistId);
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

  async addMarker(ownerId: string, sourceId: string, addition: MarkerAddition) {
    return addMarkerToRepository(this, ownerId, sourceId, addition);
  }

  async renameMarker(
    ownerId: string,
    sourceId: string,
    markerId: string,
    name: string,
  ) {
    return renameMarkerInRepository(this, ownerId, sourceId, markerId, name);
  }

  async moveMarker(
    ownerId: string,
    sourceId: string,
    markerId: string,
    positionMs: number,
  ) {
    return moveMarkerInRepository(
      this,
      ownerId,
      sourceId,
      markerId,
      positionMs,
    );
  }

  async deleteMarker(ownerId: string, sourceId: string, markerId: string) {
    return deleteMarkerFromRepository(this, ownerId, sourceId, markerId);
  }

  async addSheetMusicSource(
    ownerId: string,
    sourceId: string,
    addition: SheetMusicAddition,
  ) {
    return addSheetMusicSourceToRepository(this, ownerId, sourceId, addition);
  }

  async updateSheetMusicSource(
    ownerId: string,
    sourceId: string,
    sheetMusicId: string,
    change: SheetMusicChange,
  ) {
    return updateSheetMusicSourceInRepository(
      this,
      ownerId,
      sourceId,
      sheetMusicId,
      change,
    );
  }

  async removeSheetMusicSource(
    ownerId: string,
    sourceId: string,
    sheetMusicId: string,
  ) {
    return removeSheetMusicSourceFromRepository(
      this,
      ownerId,
      sourceId,
      sheetMusicId,
    );
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
