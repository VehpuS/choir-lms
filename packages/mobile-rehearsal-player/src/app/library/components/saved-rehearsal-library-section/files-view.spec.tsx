import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  type NamedLoop,
  type Playlist,
  type RehearsalLibraryFileTree,
} from '@org/audio-library-models';

import { buildLibraryFilesExplorerState } from '../../saved-rehearsal-library/library-files-model';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import { buildSavedRehearsalLibraryFilesViewModel } from './files-view-model';

const SOURCE = createDriveAudioSource({
  availability: {
    status: 'available',
  },
  driveFileId: 'drive-file-1',
  durationMs: 245000,
  mimeType: 'audio/mpeg',
  name: 'Full Choir.mp3',
});

const PLAYLIST: Playlist = {
  createdAt: '2026-07-01T00:00:00.000Z',
  id: 'playlist-1',
  items: [],
  name: 'Evening Warmups',
  ownerId: 'user-1',
  ownershipScope: 'user',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

const LOOP: NamedLoop = {
  createdAt: '2026-07-01T00:00:00.000Z',
  endMs: 44000,
  id: 'loop-1',
  name: 'Kyrie entrance',
  ownerId: 'user-1',
  ownershipScope: 'user',
  sourceId: SOURCE.id,
  sourceName: SOURCE.name,
  startMs: 12000,
  updatedAt: '2026-07-01T00:00:00.000Z',
};

const TREE: RehearsalLibraryFileTree = {
  fileLinks: [
    {
      entityId: LOOP.id,
      entityKind: 'loop',
      id: `file-link:loop:${LOOP.id}`,
      parentFolderId: 'folder-warmups',
    },
    {
      entityId: PLAYLIST.id,
      entityKind: 'playlist',
      id: `file-link:playlist:${PLAYLIST.id}`,
      parentFolderId: 'folder-warmups',
    },
    {
      entityId: SOURCE.id,
      entityKind: 'track',
      id: `file-link:track:${SOURCE.id}`,
      parentFolderId: 'folder-warmups',
    },
  ],
  folders: [
    {
      id: 'folder:library-root',
      name: 'Library',
      parentFolderId: null,
    },
    {
      id: 'folder-warmups',
      name: 'Warmups',
      parentFolderId: 'folder:library-root',
    },
    {
      id: 'folder-altos',
      name: 'Alto Section',
      parentFolderId: 'folder-warmups',
    },
  ],
  rootFolderId: 'folder:library-root',
  version: 1,
};

const createFilesStub = () => {
  const explorer = buildLibraryFilesExplorerState({
    currentFolderId: 'folder-warmups',
    savedLoops: [LOOP],
    savedPlaylists: [PLAYLIST],
    savedSources: [SOURCE],
    tree: TREE,
  });
  const calls = {
    goToFolder: [] as string[],
    goToParentFolder: 0,
    openFolder: [] as string[],
  };
  const files = {
    clearPendingDriveImportFolderId() {
      return undefined;
    },
    consumePendingDriveImportFolderId() {
      return null;
    },
    createFolder: async () => false,
    explorer,
    goToFolder(folderId: string) {
      calls.goToFolder.push(folderId);
    },
    goToParentFolder() {
      calls.goToParentFolder += 1;
    },
    isLoading: false,
    issue: null,
    linkEntityToCurrentFolder: async () => false,
    linkEntityToFolder: async () => false,
    openFolder(folderId: string) {
      calls.openFolder.push(folderId);
    },
    pendingDriveImportFolderId: null,
    refresh: async () => null,
    rootFolderId: TREE.rootFolderId,
    stageDriveImportForCurrentFolder() {
      return undefined;
    },
  } satisfies Partial<UseLibraryFilesResult>;

  return {
    calls,
    files: files as UseLibraryFilesResult,
  };
};

describe('SavedRehearsalLibraryFilesView', () => {
  it('builds Files interactions for parent navigation, breadcrumb jumps, folder browsing, and playlist opening', async () => {
    const { calls, files } = createFilesStub();
    const openedPlaylists: string[] = [];
    const viewModel = buildSavedRehearsalLibraryFilesViewModel({
      activePlayableItem: null,
      files,
      onOpenPlaylist: (playlistId) => {
        openedPlaylists.push(playlistId);
      },
      onTogglePlayableItemPlayback: async () => undefined,
      onToggleSourcePlayback: async () => undefined,
    });

    assert.ok(viewModel);

    files.goToParentFolder();
    viewModel?.breadcrumbs[0]?.onPress?.();
    viewModel?.rows
      .find((row) => {
        return row.label === 'Alto Section';
      })
      ?.onPress();
    viewModel?.rows
      .find((row) => {
        return row.label === 'Evening Warmups';
      })
      ?.onPress();

    assert.equal(calls.goToParentFolder, 1);
    assert.deepEqual(calls.goToFolder, ['folder:library-root']);
    assert.deepEqual(calls.openFolder, ['folder-altos']);
    assert.deepEqual(openedPlaylists, ['playlist-1']);
  });

  it('exposes direct add actions for nearby tracks and loops in Files add-items mode', () => {
    const { files } = createFilesStub();
    const addedLoopIds: string[] = [];
    const addedSourceIds: string[] = [];
    const viewModel = buildSavedRehearsalLibraryFilesViewModel({
      activePlayableItem: null,
      files,
      onOpenPlaylist: () => undefined,
      onTogglePlayableItemPlayback: async () => undefined,
      onToggleSourcePlayback: async () => undefined,
      playlistAddMode: {
        canMutatePlaylists: true,
        isPlaylistMutating: false,
        isSavedLibraryMutating: false,
        onAddLoop(loopId: string) {
          addedLoopIds.push(loopId);
        },
        onAddSource(sourceId: string) {
          addedSourceIds.push(sourceId);
        },
        playlistName: PLAYLIST.name,
      },
    });

    const trackRow = viewModel?.rows.find((row) => {
      return row.label === SOURCE.name;
    });
    const loopRow = viewModel?.rows.find((row) => {
      return row.label === LOOP.name;
    });

    assert.equal(trackRow?.addAction?.label, 'Add');
    assert.equal(loopRow?.addAction?.label, 'Add');
    assert.equal(
      viewModel?.rows.find((row) => row.label === PLAYLIST.name)?.addAction,
      undefined,
    );
    assert.equal(
      viewModel?.rows.find((row) => row.label === 'Alto Section')?.addAction,
      undefined,
    );

    trackRow?.addAction?.onPress();
    loopRow?.addAction?.onPress();

    assert.deepEqual(addedSourceIds, [SOURCE.id]);
    assert.deepEqual(addedLoopIds, [LOOP.id]);
  });
});
