import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  type NamedLoop,
  type Playlist,
  type RehearsalLibraryFileTree,
} from '@org/audio-library-models';

import { buildLibraryFilesExplorerState } from './library-files-model';
import {
  AVAILABLE_SOURCE,
  PLAYLIST,
  SAVED_LOOP,
  UNAVAILABLE_SOURCE,
} from './library-files-model-test-fixtures';

describe('library-files model sort', () => {
  it('sorts Files names case-insensitively when name sort is active', () => {
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: AVAILABLE_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${AVAILABLE_SOURCE.id}`,
          parentFolderId: 'folder:library-root',
          visibleName: 'bravo track',
        },
        {
          entityId: UNAVAILABLE_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${UNAVAILABLE_SOURCE.id}`,
          parentFolderId: 'folder:library-root',
          visibleName: 'Alpha track',
        },
      ],
      folders: [
        { id: 'folder:library-root', name: 'Library', parentFolderId: null, createdAt: '2026-05-10T10:00:00.000Z' },
        {
          id: 'folder-zeta',
          name: 'zeta folder',
          parentFolderId: 'folder:library-root',
          createdAt: '2026-05-10T10:00:00.000Z',
        },
        {
          id: 'folder-alpha',
          name: 'Alpha folder',
          parentFolderId: 'folder:library-root',
          createdAt: '2026-05-10T10:00:00.000Z',
        },
      ],
      rootFolderId: 'folder:library-root',
      version: 1,
    };

    const explorer = buildLibraryFilesExplorerState({
      currentFolderId: 'folder:library-root',
      savedLoops: [],
      savedPlaylists: [],
      savedSources: [AVAILABLE_SOURCE, UNAVAILABLE_SOURCE],
      searchOptions: {
        activeSearchQuery: null,
        entityFilter: 'all',
        searchScope: 'current-folder',
        selectedTagFilters: [],
        sortMode: 'name',
      },
      tree,
    });

    assert.deepEqual(
      explorer.rows.map((row) => row.label),
      ['Alpha folder', 'zeta folder', 'Alpha track', 'bravo track'],
    );
  });

  it('groups non-folder Files rows by type after the folder group', () => {
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: PLAYLIST.id,
          entityKind: 'playlist',
          id: `file-link:playlist:${PLAYLIST.id}`,
          parentFolderId: 'folder:library-root',
        },
        {
          entityId: SAVED_LOOP.id,
          entityKind: 'loop',
          id: `file-link:loop:${SAVED_LOOP.id}`,
          parentFolderId: 'folder:library-root',
        },
        {
          entityId: AVAILABLE_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${AVAILABLE_SOURCE.id}`,
          parentFolderId: 'folder:library-root',
        },
      ],
      folders: [
        { id: 'folder:library-root', name: 'Library', parentFolderId: null, createdAt: '2026-05-10T10:00:00.000Z' },
        {
          id: 'folder-warmups',
          name: 'Warmups',
          parentFolderId: 'folder:library-root',
          createdAt: '2026-05-10T10:00:00.000Z',
        },
      ],
      rootFolderId: 'folder:library-root',
      version: 1,
    };

    const explorer = buildLibraryFilesExplorerState({
      currentFolderId: 'folder:library-root',
      savedLoops: [SAVED_LOOP],
      savedPlaylists: [PLAYLIST],
      savedSources: [AVAILABLE_SOURCE],
      searchOptions: {
        activeSearchQuery: null,
        entityFilter: 'all',
        searchScope: 'current-folder',
        selectedTagFilters: [],
        sortMode: 'type',
      },
      tree,
    });

    assert.deepEqual(
      explorer.rows.map((row) => ({ kind: row.kind, label: row.label })),
      [
        { kind: 'folder', label: 'Warmups' },
        { kind: 'track', label: 'Full Choir.mp3' },
        { kind: 'loop', label: 'Verse entrance' },
        { kind: 'playlist', label: 'Evening Warmups' },
      ],
    );
  });

  it('sorts Files rows newest-first for date-added and date-opened modes', () => {
    const newerLoop: NamedLoop = {
      ...SAVED_LOOP,
      createdAt: '2026-07-06T09:00:00.000Z',
      id: 'loop-2',
      name: 'Crescendo cue',
      updatedAt: '2026-07-06T09:00:00.000Z',
    };
    const newerPlaylist: Playlist = {
      ...PLAYLIST,
      createdAt: '2026-07-04T09:00:00.000Z',
      id: 'playlist-2',
      name: 'Festival Set',
      updatedAt: '2026-07-04T09:00:00.000Z',
    };
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: newerPlaylist.id,
          entityKind: 'playlist',
          id: `file-link:playlist:${newerPlaylist.id}`,
          parentFolderId: 'folder:library-root',
        },
        {
          entityId: newerLoop.id,
          entityKind: 'loop',
          id: `file-link:loop:${newerLoop.id}`,
          parentFolderId: 'folder:library-root',
        },
        {
          entityId: AVAILABLE_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${AVAILABLE_SOURCE.id}`,
          parentFolderId: 'folder:library-root',
        },
      ],
      folders: [
        { id: 'folder:library-root', name: 'Library', parentFolderId: null, createdAt: '2026-05-10T10:00:00.000Z' },
        {
          id: 'folder-alpha',
          name: 'Archive',
          parentFolderId: 'folder:library-root',
          createdAt: '2026-05-10T10:00:00.000Z',
        },
      ],
      rootFolderId: 'folder:library-root',
      version: 1,
    };

    const dateAddedExplorer = buildLibraryFilesExplorerState({
      currentFolderId: 'folder:library-root',
      savedLoops: [newerLoop],
      savedPlaylists: [newerPlaylist],
      savedSources: [AVAILABLE_SOURCE],
      searchOptions: {
        activeSearchQuery: null,
        entityFilter: 'all',
        searchScope: 'current-folder',
        selectedTagFilters: [],
        sortMode: 'date-added',
      },
      tree,
    });

    assert.deepEqual(
      dateAddedExplorer.rows.map((row) => row.label),
      ['Archive', 'Crescendo cue', 'Full Choir.mp3', 'Festival Set'],
    );

    const dateOpenedExplorer = buildLibraryFilesExplorerState({
      currentFolderId: 'folder:library-root',
      savedLoops: [newerLoop],
      savedPlaylists: [newerPlaylist],
      savedSources: [AVAILABLE_SOURCE],
      searchOptions: {
        activeSearchQuery: null,
        entityFilter: 'all',
        openedAtByNodeKey: {
          'folder-alpha': '2026-07-08T09:00:00.000Z',
          [`file-link:playlist:${newerPlaylist.id}`]:
            '2026-07-07T09:00:00.000Z',
          [`file-link:track:${AVAILABLE_SOURCE.id}`]:
            '2026-07-09T09:00:00.000Z',
        },
        searchScope: 'current-folder',
        selectedTagFilters: [],
        sortMode: 'date-opened',
      },
      tree,
    });

    assert.deepEqual(
      dateOpenedExplorer.rows.map((row) => row.label),
      ['Archive', 'Full Choir.mp3', 'Festival Set', 'Crescendo cue'],
    );
  });
});
