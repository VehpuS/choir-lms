import {
  renameTrackInRepository,
  type TrackRenameCopies,
  type TrackRenameResult,
} from './rename-track';
import {
  type CompositeTrack,
  type DriveAudioSource,
  type NamedLoop,
  type Playlist,
  type RehearsalLibraryFileLinkNode,
  type RehearsalLibraryFileTree,
  type RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import {
  deleteLibraryFileLinkFromRepository,
  deleteLibraryFolderNodeFromRepository,
  normalizeStoredSources,
} from './async-storage-practice-repository-helpers';

import {
  listStoredComposites,
  updateStoredComposites,
} from './composites-storage';
import {
  importLibraryEntities,
  importLibraryTreeNodes,
  type ImportedEntities,
  type ImportedTreeNodes,
} from './library-bundle-import-storage';
import {
  replaceLibraryStorage,
  type ReplacementLibraryState,
} from './library-replace-storage';
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

  /** Renames a track and, as chosen, the Files copies that carry its name. */
  async renameTrack(
    ownerId: string,
    options: { copies: TrackRenameCopies; name: string; sourceId: string },
  ): Promise<TrackRenameResult> {
    return renameTrackInRepository(this, ownerId, options);
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

  async listComposites(ownerId: string): Promise<CompositeTrack[]> {
    return listStoredComposites(ownerId);
  }

  async deleteComposite(
    ownerId: string,
    compositeId: string,
  ): Promise<CompositeTrack[]> {
    return updateStoredComposites(ownerId, (composites) =>
      composites.filter(({ id }) => id !== compositeId),
    );
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
  ): Promise<RehearsalLibraryFileTree> {
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
  ): Promise<RehearsalLibraryFileTree> {
    return saveLibraryNodesToRepository(this, ownerId, nodes);
  }

  /** Writes imported entities in bulk, one write per collection (see the import storage notes). */
  async importLibraryEntities(ownerId: string, entities: ImportedEntities) {
    return importLibraryEntities(ownerId, entities);
  }

  /**
   * Replaces the whole library in one commit (staged, then swapped with a
   * single marker write; an interrupted swap is finished on the next read).
   * Returns the tracks that no longer exist so their caches can be dropped.
   */
  async replaceLibrary(ownerId: string, state: ReplacementLibraryState) {
    return replaceLibraryStorage(ownerId, state);
  }

  /** Writes an import's folders and links with one tree write. */
  async importLibraryTreeNodes(ownerId: string, nodes: ImportedTreeNodes) {
    return importLibraryTreeNodes(this, ownerId, nodes);
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
