import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { type RehearsalLibraryFileTree } from '@org/audio-library-models';

import { buildLibraryFilesExplorerState } from './library-files-model';
import {
  AVAILABLE_SOURCE,
  PLAYLIST,
  SAVED_LOOP,
  UNAVAILABLE_SOURCE,
} from './library-files-model-test-fixtures';

describe('library-files model search', () => {
  it('keeps Files search scoped to the current folder subtree by default', () => {
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: AVAILABLE_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${AVAILABLE_SOURCE.id}`,
          parentFolderId: 'folder-warmups-child',
          visibleName: 'Warm entrance',
        },
        {
          entityId: UNAVAILABLE_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${UNAVAILABLE_SOURCE.id}`,
          parentFolderId: 'folder-anthems',
          visibleName: 'Warm ending',
        },
      ],
      folders: [
        { id: 'folder:library-root', name: 'Library', parentFolderId: null },
        {
          id: 'folder-warmups',
          name: 'Warmups',
          parentFolderId: 'folder:library-root',
        },
        {
          id: 'folder-warmups-child',
          name: 'Entrances',
          parentFolderId: 'folder-warmups',
        },
        {
          id: 'folder-anthems',
          name: 'Anthems',
          parentFolderId: 'folder:library-root',
        },
      ],
      rootFolderId: 'folder:library-root',
      version: 1,
    };

    const explorer = buildLibraryFilesExplorerState({
      currentFolderId: 'folder-warmups',
      savedLoops: [],
      savedPlaylists: [],
      savedSources: [AVAILABLE_SOURCE, UNAVAILABLE_SOURCE],
      searchOptions: {
        activeSearchQuery: 'warm',
        entityFilter: 'all',
        searchScope: 'current-folder',
        selectedTagFilters: [],
      },
      tree,
    });

    assert.deepEqual(
      explorer.rows.map((row) => row.label),
      ['Warm entrance'],
    );
    assert.equal(explorer.rows[0]?.kind, 'track');
    assert.equal(
      explorer.rows[0]?.supportingLabel,
      'Library / Warmups / Entrances • Track • 4:05',
    );
  });

  it('shows loop parent-track context in Files search results', () => {
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: SAVED_LOOP.id,
          entityKind: 'loop',
          id: `file-link:loop:${SAVED_LOOP.id}`,
          parentFolderId: 'folder:library-root',
          visibleName: 'Warm loop',
        },
      ],
      folders: [
        { id: 'folder:library-root', name: 'Library', parentFolderId: null },
      ],
      rootFolderId: 'folder:library-root',
      version: 1,
    };

    const explorer = buildLibraryFilesExplorerState({
      currentFolderId: 'folder:library-root',
      savedLoops: [SAVED_LOOP],
      savedPlaylists: [],
      savedSources: [AVAILABLE_SOURCE],
      searchOptions: {
        activeSearchQuery: 'warm',
        entityFilter: 'all',
        searchScope: 'current-folder',
        selectedTagFilters: [],
      },
      tree,
    });

    assert.deepEqual(
      explorer.rows.map((row) => ({
        kind: row.kind,
        supportingLabel: row.supportingLabel,
      })),
      [
        {
          kind: 'loop',
          supportingLabel: 'Parent track: Full Choir.mp3 • 0:12 to 0:24',
        },
      ],
    );
  });

  it('broadens Files search to All Files and adds containing-path metadata for out-of-folder matches', () => {
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: AVAILABLE_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${AVAILABLE_SOURCE.id}`,
          parentFolderId: 'folder-warmups-child',
          visibleName: 'Warm entrance',
        },
        {
          entityId: UNAVAILABLE_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${UNAVAILABLE_SOURCE.id}`,
          parentFolderId: 'folder-anthems',
          visibleName: 'Warm ending',
        },
      ],
      folders: [
        { id: 'folder:library-root', name: 'Library', parentFolderId: null },
        {
          id: 'folder-warmups',
          name: 'Warmups',
          parentFolderId: 'folder:library-root',
        },
        {
          id: 'folder-warmups-child',
          name: 'Entrances',
          parentFolderId: 'folder-warmups',
        },
        {
          id: 'folder-anthems',
          name: 'Anthems',
          parentFolderId: 'folder:library-root',
        },
      ],
      rootFolderId: 'folder:library-root',
      version: 1,
    };

    const explorer = buildLibraryFilesExplorerState({
      currentFolderId: 'folder-warmups',
      savedLoops: [],
      savedPlaylists: [],
      savedSources: [AVAILABLE_SOURCE, UNAVAILABLE_SOURCE],
      searchOptions: {
        activeSearchQuery: 'warm',
        entityFilter: 'all',
        searchScope: 'all-files',
        selectedTagFilters: [],
      },
      tree,
    });

    assert.deepEqual(
      explorer.rows.map((row) => ({
        kind: row.kind,
        label: row.label,
        supportingLabel: row.supportingLabel,
      })),
      [
        {
          kind: 'track',
          label: 'Warm ending',
          supportingLabel: 'Library / Anthems • Track unavailable',
        },
        {
          kind: 'track',
          label: 'Warm entrance',
          supportingLabel: 'Library / Warmups / Entrances • Track • 4:05',
        },
      ],
    );
  });

  it('keeps folder matches grouped before file matches in mixed Files search results', () => {
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: AVAILABLE_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${AVAILABLE_SOURCE.id}`,
          parentFolderId: 'folder:library-root',
          visibleName: 'Warm anthem',
        },
      ],
      folders: [
        { id: 'folder:library-root', name: 'Library', parentFolderId: null },
        {
          id: 'folder-warmups',
          name: 'Warmups',
          parentFolderId: 'folder:library-root',
        },
      ],
      rootFolderId: 'folder:library-root',
      version: 1,
    };

    const explorer = buildLibraryFilesExplorerState({
      currentFolderId: 'folder:library-root',
      savedLoops: [],
      savedPlaylists: [],
      savedSources: [AVAILABLE_SOURCE],
      searchOptions: {
        activeSearchQuery: 'warm',
        entityFilter: 'all',
        searchScope: 'all-files',
        selectedTagFilters: [],
        sortMode: 'name',
      },
      tree,
    });

    assert.deepEqual(
      explorer.rows.map((row) => ({ kind: row.kind, label: row.label })),
      [
        { kind: 'folder', label: 'Warmups' },
        { kind: 'track', label: 'Warm anthem' },
      ],
    );
  });

  it('keeps Files search results on the active sort mode after filtering', () => {
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: PLAYLIST.id,
          entityKind: 'playlist',
          id: `file-link:playlist:${PLAYLIST.id}`,
          parentFolderId: 'folder:library-root',
          visibleName: 'Warm playlist',
        },
        {
          entityId: SAVED_LOOP.id,
          entityKind: 'loop',
          id: `file-link:loop:${SAVED_LOOP.id}`,
          parentFolderId: 'folder:library-root',
          visibleName: 'Warm loop',
        },
        {
          entityId: AVAILABLE_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${AVAILABLE_SOURCE.id}`,
          parentFolderId: 'folder:library-root',
          visibleName: 'Warm track',
        },
      ],
      folders: [
        { id: 'folder:library-root', name: 'Library', parentFolderId: null },
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
        activeSearchQuery: 'warm',
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
        { kind: 'track', label: 'Warm track' },
        { kind: 'loop', label: 'Warm loop' },
        { kind: 'playlist', label: 'Warm playlist' },
      ],
    );
  });
});
