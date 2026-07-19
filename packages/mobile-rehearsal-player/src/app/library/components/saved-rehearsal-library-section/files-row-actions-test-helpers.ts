import {
  createDriveAudioSource,
  type NamedLoop,
  type Playlist,
} from '@org/audio-library-models';

import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';

export const SOURCE = createDriveAudioSource({
  availability: {
    status: 'available',
  },
  driveFileId: 'drive-file-1',
  durationMs: 245000,
  mimeType: 'audio/mpeg',
  name: 'Full Choir.mp3',
});

export const UNAVAILABLE_SOURCE = createDriveAudioSource({
  availability: {
    message: 'Reconnect Drive to restore this track.',
    reason: 'authorization-required',
    status: 'unavailable',
  },
  driveFileId: 'drive-file-2',
  durationMs: 245000,
  mimeType: 'audio/mpeg',
  name: 'Disconnected Choir.mp3',
});

export const LOOP: NamedLoop = {
  createdAt: '2026-07-01T00:00:00.000Z',
  endMs: 24000,
  id: 'loop-1',
  name: 'Verse entrance',
  ownerId: 'user-1',
  ownershipScope: 'user',
  sourceId: SOURCE.id,
  sourceName: SOURCE.name,
  startMs: 12000,
  updatedAt: '2026-07-01T00:00:00.000Z',
};

export const PLAYLIST: Playlist = {
  createdAt: '2026-07-01T00:00:00.000Z',
  id: 'playlist-1',
  items: [],
  name: 'Evening Warmups',
  ownerId: 'user-1',
  ownershipScope: 'user',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

export const createBaseOptions = () => {
  const calls = {
    copies: [] as string[],
    deletions: [] as string[],
    folders: [] as string[],
    loopBuilders: [] as string[],
    loopPlaylists: [] as string[],
    loopTags: [] as string[],
    moves: [] as string[],
    next: [] as string[],
    playlistTags: [] as string[],
    reconnects: [] as string[],
    renames: [] as string[],
    removals: [] as string[],
    sourcePlaylists: [] as string[],
    sourceTags: [] as string[],
    upNext: [] as string[],
  };

  return {
    calls,
    options: {
      canMutateLibrary: true,
      canMutateLoops: true,
      canMutatePlaylists: true,
      canQueueAsNext: true,
      canReconnectLibrarySource: true,
      isLoopBuilderPreparing: false,
      isLoopMutating: false,
      isPlaylistMutating: false,
      isSavedLibraryMutating: false,
      onCreateFileLinkCopy(row: LibraryFilesRow) {
        calls.copies.push(row.kind);
      },
      onDeleteFileNode(row: LibraryFilesRow) {
        calls.deletions.push(row.kind);
      },
      onMoveFileNode(row: LibraryFilesRow) {
        calls.moves.push(row.kind);
      },
      onOpenFolder(folderId: string) {
        calls.folders.push(folderId);
      },
      onOpenLoopBuilder(sourceId: string) {
        calls.loopBuilders.push(sourceId);
      },
      onOpenLoopPlaylistSelector(loopId: string) {
        calls.loopPlaylists.push(loopId);
      },
      onOpenLoopTagEditor(loopId: string) {
        calls.loopTags.push(loopId);
      },
      onOpenPlaylistTagEditor(playlistId: string) {
        calls.playlistTags.push(playlistId);
      },
      onOpenSourcePlaylistSelector(sourceId: string) {
        calls.sourcePlaylists.push(sourceId);
      },
      onOpenSourceTagEditor(sourceId: string) {
        calls.sourceTags.push(sourceId);
      },
      onQueuePlayableItemNext(playableItem: { kind: string }) {
        calls.next.push(playableItem.kind);
      },
      onQueuePlayableItemUpNext(playableItem: { kind: string }) {
        calls.upNext.push(playableItem.kind);
      },
      onReconnectLibrarySource(sourceId: string) {
        calls.reconnects.push(sourceId);
      },
      onRenameFileNode(row: LibraryFilesRow) {
        calls.renames.push(row.kind);
      },
      onRemoveLibrarySource(sourceId: string) {
        calls.removals.push(sourceId);
      },
    },
  };
};
