import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  createLoopPlayableItem,
  type NamedLoop,
  type Playlist,
} from '@org/audio-library-models';

import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import { resolveFilesRowMenuActions } from './files-row-actions';

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
        'Edit tags',
      ],
    );
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

    actions[0]?.onPress();

    assert.deepEqual(
      actions.map((action) => action.label),
      ['Edit tags'],
    );
    assert.deepEqual(calls.playlistTags, [PLAYLIST.id]);
  });

  it('lets folder overflow reuse the existing open-folder navigation for now', () => {
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

    actions[0]?.onPress();

    assert.deepEqual(
      actions.map((action) => action.label),
      ['Open folder'],
    );
    assert.deepEqual(calls.folders, ['folder-warmups']);
  });
});
