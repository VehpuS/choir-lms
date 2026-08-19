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

describe('library-files model browse', () => {
  it('falls back to Files root when the requested folder no longer exists', () => {
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
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
          id: 'folder-archive',
          name: 'Archive',
          parentFolderId: 'folder:library-root',
          createdAt: '2026-05-10T10:00:00.000Z',
        },
      ],
      rootFolderId: 'folder:library-root',
      version: 1,
    };

    const explorer = buildLibraryFilesExplorerState({
      currentFolderId: 'folder-missing',
      savedLoops: [],
      savedPlaylists: [],
      savedSources: [AVAILABLE_SOURCE],
      tree,
    });

    assert.equal(explorer.currentFolder.id, 'folder:library-root');
    assert.deepEqual(explorer.breadcrumbs, [
      { folderId: 'folder:library-root', label: 'Library' },
    ]);
    assert.deepEqual(
      explorer.rows.map((row) => row.label),
      ['Archive', 'Full Choir.mp3'],
    );
    assert.equal(explorer.rows[0]?.kind, 'folder');
    assert.equal(explorer.rows[1]?.kind, 'track');
  });

  it('builds type-aware folder metadata for mixed music folders', () => {
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: AVAILABLE_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${AVAILABLE_SOURCE.id}`,
          parentFolderId: 'folder-warmups',
        },
        {
          entityId: SAVED_LOOP.id,
          entityKind: 'loop',
          id: `file-link:loop:${SAVED_LOOP.id}`,
          parentFolderId: 'folder-warmups',
        },
        {
          entityId: PLAYLIST.id,
          entityKind: 'playlist',
          id: `file-link:playlist:${PLAYLIST.id}`,
          parentFolderId: 'folder-warmups',
        },
        {
          entityId: AVAILABLE_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${AVAILABLE_SOURCE.id}:copy`,
          parentFolderId: 'folder-anthems',
        },
      ],
      folders: [
        { id: 'folder:library-root', name: 'Library', parentFolderId: null, createdAt: '2026-05-10T10:00:00.000Z' },
        {
          id: 'folder-anthems',
          name: 'Anthems',
          parentFolderId: 'folder:library-root',
          createdAt: '2026-05-10T10:00:00.000Z',
        },
        {
          id: 'folder-anthems-child',
          name: 'Archive',
          parentFolderId: 'folder-anthems',
          createdAt: '2026-05-10T10:00:00.000Z',
        },
        {
          id: 'folder-sections',
          name: 'Sections',
          parentFolderId: 'folder:library-root',
          createdAt: '2026-05-10T10:00:00.000Z',
        },
        {
          id: 'folder-sections-child',
          name: 'Altos',
          parentFolderId: 'folder-sections',
          createdAt: '2026-05-10T10:00:00.000Z',
        },
        {
          id: 'folder-warmups',
          name: 'Warmups',
          parentFolderId: 'folder:library-root',
          createdAt: '2026-05-10T10:00:00.000Z',
        },
        {
          id: 'folder-warmups-child',
          name: 'Nested Warmups',
          parentFolderId: 'folder-warmups',
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
      tree,
    });
    const folderRows = explorer.rows.filter((row) => row.kind === 'folder');
    const anthemsRow = folderRows.find(
      (row) => row.folder.id === 'folder-anthems',
    );
    const sectionsRow = folderRows.find(
      (row) => row.folder.id === 'folder-sections',
    );
    const warmupsRow = folderRows.find(
      (row) => row.folder.id === 'folder-warmups',
    );

    assert.equal(anthemsRow?.supportingLabel, '1 track • 1 folder');
    assert.equal(sectionsRow?.supportingLabel, '1 folder');
    assert.equal(warmupsRow?.supportingLabel, '1 track • 1 loop • 1 playlist');
  });

  it('builds a mixed explorer list with folders first and canonical breadcrumb paths', () => {
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: AVAILABLE_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${AVAILABLE_SOURCE.id}`,
          parentFolderId: 'folder-1',
          visibleName: 'Warmup copy',
        },
        {
          entityId: SAVED_LOOP.id,
          entityKind: 'loop',
          id: `file-link:loop:${SAVED_LOOP.id}`,
          parentFolderId: 'folder-1',
        },
        {
          entityId: PLAYLIST.id,
          entityKind: 'playlist',
          id: `file-link:playlist:${PLAYLIST.id}`,
          parentFolderId: 'folder-1',
        },
        {
          entityId: UNAVAILABLE_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${UNAVAILABLE_SOURCE.id}`,
          parentFolderId: 'folder-1',
        },
      ],
      folders: [
        { id: 'folder:library-root', name: 'Library', parentFolderId: null, createdAt: '2026-05-10T10:00:00.000Z' },
        {
          id: 'folder-1',
          name: 'Warmups',
          parentFolderId: 'folder:library-root',
          createdAt: '2026-05-10T10:00:00.000Z',
        },
        { id: 'folder-2', name: 'Alto Entrances', parentFolderId: 'folder-1', createdAt: '2026-05-10T10:00:00.000Z' },
      ],
      rootFolderId: 'folder:library-root',
      version: 1,
    };

    const explorer = buildLibraryFilesExplorerState({
      currentFolderId: 'folder-1',
      savedLoops: [SAVED_LOOP],
      savedPlaylists: [PLAYLIST],
      savedSources: [AVAILABLE_SOURCE, UNAVAILABLE_SOURCE],
      tree,
    });

    assert.deepEqual(explorer.breadcrumbs, [
      { folderId: 'folder:library-root', label: 'Library' },
      { folderId: 'folder-1', label: 'Warmups' },
    ]);
    assert.deepEqual(
      explorer.rows.map((row) => row.label),
      [
        'Alto Entrances',
        'Evening Warmups',
        'Section Notes.mp3',
        'Verse entrance',
        'Warmup copy',
      ],
    );
    assert.equal(explorer.rows[0]?.kind, 'folder');
    assert.equal(explorer.rows[1]?.kind, 'playlist');
    assert.equal(explorer.rows[2]?.kind, 'track');
    assert.equal(explorer.rows[3]?.kind, 'loop');
    assert.equal(explorer.rows[4]?.kind, 'track');
  });

  it('preserves visible-name overrides and exposes availability metadata on entity rows', () => {
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: AVAILABLE_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${AVAILABLE_SOURCE.id}`,
          parentFolderId: 'folder:library-root',
          visibleName: 'Mass entry copy',
        },
        {
          entityId: SAVED_LOOP.id,
          entityKind: 'loop',
          id: `file-link:loop:${SAVED_LOOP.id}`,
          parentFolderId: 'folder:library-root',
        },
      ],
      folders: [
        { id: 'folder:library-root', name: 'Library', parentFolderId: null, createdAt: '2026-05-10T10:00:00.000Z' },
      ],
      rootFolderId: 'folder:library-root',
      version: 1,
    };

    const explorer = buildLibraryFilesExplorerState({
      currentFolderId: 'folder:library-root',
      savedLoops: [SAVED_LOOP],
      savedPlaylists: [],
      savedSources: [AVAILABLE_SOURCE],
      tree,
    });
    const trackRow = explorer.rows.find((row) => row.kind === 'track');
    const loopRow = explorer.rows.find((row) => row.kind === 'loop');

    assert.equal(trackRow?.label, 'Mass entry copy');
    assert.equal(trackRow?.kind, 'track');
    assert.equal(trackRow?.supportingLabel, 'Track • 4:05');
    assert.equal(loopRow?.kind, 'loop');
    assert.equal(
      loopRow?.supportingLabel,
      'Parent track: Full Choir.mp3 • 0:12 to 0:24',
    );
  });
});
