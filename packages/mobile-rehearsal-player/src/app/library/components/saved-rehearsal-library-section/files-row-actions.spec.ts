import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  createLoopPlayableItem,
  type NamedLoop,
  type Playlist,
} from '@org/audio-library-models';

import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import {
  getDeleteFromFolderConfirmationCopy,
  getTrackRemoveFromLibraryPlacementLabel,
  resolveFilesRowMenuActions,
} from './files-row-actions';

const SOURCE = createDriveAudioSource({
  availability: {
    status: 'available',
  },
  driveFileId: 'drive-file-1',
  durationMs: 245000,
  mimeType: 'audio/mpeg',
  name: 'Full Choir.mp3',
});

const LOOP: NamedLoop = {
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

const PLAYLIST: Playlist = {
  createdAt: '2026-07-01T00:00:00.000Z',
  id: 'playlist-1',
  items: [],
  name: 'Evening Warmups',
  ownerId: 'user-1',
  ownershipScope: 'user',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

const createBaseOptions = () => {
  const calls = {
    folders: [] as string[],
    loopBuilders: [] as string[],
    loopPlaylists: [] as string[],
    loopTags: [] as string[],
    next: [] as string[],
    playlistTags: [] as string[],
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
      isLoopBuilderPreparing: false,
      isLoopMutating: false,
      isPlaylistMutating: false,
      isSavedLibraryMutating: false,
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
    },
  };
};

describe('resolveFilesRowMenuActions', () => {
  it('keeps Files track queue actions in the first menu level before playlist and tag flows', () => {
    const { options } = createBaseOptions();
    const row: LibraryFilesRow = {
      fileLink: {
        entityId: SOURCE.id,
        entityKind: 'track',
        id: `file-link:track:${SOURCE.id}`,
        parentFolderId: 'folder:library-root',
      },
      isPlayable: true,
      kind: 'track',
      label: SOURCE.name,
      source: SOURCE,
      supportingLabel: 'Track • 4:05',
    };

    const actions = resolveFilesRowMenuActions({
      ...options,
      row,
    });

    assert.deepEqual(
      actions.map((action) => action.label),
      [
        'Play next',
        'Add to queue',
        'Make loop',
        'Add to playlist',
        'Create a copy',
        'Edit tags',
        'Rename',
        'Move to folder',
        'Delete from folder',
        'Remove from library',
      ],
    );
    assert.equal(actions.at(-2)?.tone, 'destructive');
    assert.equal(actions.at(-1)?.tone, 'destructive');
  });

  it('routes loop menu actions into the existing queue, playlist, and tag flows', () => {
    const { calls, options } = createBaseOptions();
    const row: LibraryFilesRow = {
      fileLink: {
        entityId: LOOP.id,
        entityKind: 'loop',
        id: `file-link:loop:${LOOP.id}`,
        parentFolderId: 'folder:library-root',
      },
      kind: 'loop',
      label: LOOP.name,
      loop: LOOP,
      playableItem: createLoopPlayableItem(LOOP, SOURCE),
      source: SOURCE,
      supportingLabel: `${SOURCE.name} • 0:12 to 0:24`,
    };

    const actions = resolveFilesRowMenuActions({
      ...options,
      row,
    });

    actions.find((action) => action.label === 'Add to playlist')?.onPress();
    actions.find((action) => action.label === 'Edit tags')?.onPress();

    assert.deepEqual(calls.loopPlaylists, [LOOP.id]);
    assert.deepEqual(calls.loopTags, [LOOP.id]);
    assert.deepEqual(
      actions.map((action) => action.label),
      [
        'Play next',
        'Add to queue',
        'Add to playlist',
        'Create a copy',
        'Edit tags',
        'Rename',
        'Move to folder',
        'Delete from folder',
      ],
    );
  });

  it('keeps playlist links on the existing playlist tag editor flow', () => {
    const { calls, options } = createBaseOptions();
    const row: LibraryFilesRow = {
      fileLink: {
        entityId: PLAYLIST.id,
        entityKind: 'playlist',
        id: `file-link:playlist:${PLAYLIST.id}`,
        parentFolderId: 'folder:library-root',
      },
      kind: 'playlist',
      label: PLAYLIST.name,
      playlist: PLAYLIST,
      supportingLabel: '0 items',
    };

    const actions = resolveFilesRowMenuActions({
      ...options,
      row,
    });

    actions.find((action) => action.label === 'Edit tags')?.onPress();

    assert.deepEqual(
      actions.map((action) => action.label),
      [
        'Create a copy',
        'Edit tags',
        'Rename',
        'Move to folder',
        'Delete from folder',
      ],
    );
    assert.deepEqual(calls.playlistTags, [PLAYLIST.id]);
  });

  it('keeps folder overflow aligned with standard Files management actions', () => {
    const { calls, options } = createBaseOptions();
    const row: LibraryFilesRow = {
      childCount: 1,
      folder: {
        id: 'folder-warmups',
        name: 'Warmups',
        parentFolderId: 'folder:library-root',
      },
      kind: 'folder',
      label: 'Warmups',
      supportingLabel: '1 item',
    };

    const actions = resolveFilesRowMenuActions({
      ...options,
      row,
    });

    assert.deepEqual(
      actions.map((action) => action.label),
      ['Edit tags', 'Rename', 'Move to folder', 'Delete from folder'],
    );
    assert.deepEqual(calls.folders, []);
  });

  it('builds pointer-aware confirmation copy for Delete from folder', () => {
    const keepEntityCopy = getDeleteFromFolderConfirmationCopy({
      isLastLink: false,
      itemName: SOURCE.name,
    });
    const deleteEntityCopy = getDeleteFromFolderConfirmationCopy({
      isLastLink: true,
      itemName: SOURCE.name,
    });

    assert.equal(keepEntityCopy.title, 'Delete from folder?');
    assert.match(keepEntityCopy.message, /Only this folder link/);
    assert.equal(keepEntityCopy.confirmLabel, 'Delete from folder');

    assert.equal(deleteEntityCopy.title, 'Delete last link from folder?');
    assert.match(deleteEntityCopy.message, /last link/);
    assert.equal(deleteEntityCopy.confirmLabel, 'Delete item from library');
  });

  it('documents explicit track-level Remove from library placement', () => {
    assert.match(
      getTrackRemoveFromLibraryPlacementLabel(),
      /final destructive action/,
    );
  });
});
