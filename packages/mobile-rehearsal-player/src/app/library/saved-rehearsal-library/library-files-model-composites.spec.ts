import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createCompositeTrack,
  type RehearsalLibraryFileTree,
} from '@org/audio-library-models';

import { buildLibraryFilesExplorerState } from './library-files-model';
import {
  AVAILABLE_SOURCE,
  LIBRARY_ROOT_FOLDER,
  UNAVAILABLE_SOURCE,
} from './library-files-model-test-fixtures';

const COMPOSITE = createCompositeTrack({
  createId: () => 'composite-1',
  createdAt: '2026-11-09T10:00:00.000Z',
  draft: {
    name: 'Ubi caritas',
    stems: [
      { name: 'Soprano', trackId: AVAILABLE_SOURCE.id },
      { name: 'Bass', trackId: UNAVAILABLE_SOURCE.id },
    ],
  },
});

if (!COMPOSITE) {
  throw new Error('The fixture composite needs two stems.');
}

const TREE: RehearsalLibraryFileTree = {
  fileLinks: [
    {
      entityId: COMPOSITE.id,
      entityKind: 'composite',
      id: 'file-link:composite:composite-1',
      parentFolderId: 'folder:library-root',
    },
  ],
  folders: [LIBRARY_ROOT_FOLDER],
  rootFolderId: 'folder:library-root',
  version: 1,
};

const buildState = (
  searchOptions?: Parameters<
    typeof buildLibraryFilesExplorerState
  >[0]['searchOptions'],
) =>
  buildLibraryFilesExplorerState({
    currentFolderId: 'folder:library-root',
    savedComposites: [COMPOSITE],
    savedLoops: [],
    savedPlaylists: [],
    savedSources: [AVAILABLE_SOURCE, UNAVAILABLE_SOURCE],
    searchOptions,
    tree: TREE,
  });

describe('library-files model composites', () => {
  it('lists a composite file with its badge, length note and playable item', () => {
    const [row] = buildState().rows;

    assert.equal(row?.kind, 'composite');

    if (row?.kind !== 'composite') {
      return;
    }

    assert.equal(row.label, 'Ubi caritas');
    assert.match(row.supportingLabel, /^Composite · 2 stems/);
    assert.match(row.supportingLabel, /1 stem missing/);
    assert.equal(row.playableItem?.kind, 'composite');
  });

  it('shows a composite whose stems are all missing without a playable item', () => {
    const state = buildLibraryFilesExplorerState({
      currentFolderId: 'folder:library-root',
      savedComposites: [COMPOSITE],
      savedLoops: [],
      savedPlaylists: [],
      savedSources: [],
      tree: TREE,
    });
    const [row] = state.rows;

    assert.equal(row?.kind, 'composite');
    assert.equal(row?.kind === 'composite' ? row.playableItem : 'x', null);
  });

  it('skips a composite link whose composite is gone', () => {
    const state = buildLibraryFilesExplorerState({
      currentFolderId: 'folder:library-root',
      savedComposites: [],
      savedLoops: [],
      savedPlaylists: [],
      savedSources: [],
      tree: TREE,
    });

    assert.deepEqual(state.rows, []);
  });

  it('counts composites in a folder row', () => {
    const state = buildLibraryFilesExplorerState({
      currentFolderId: 'folder:library-root',
      savedComposites: [COMPOSITE],
      savedLoops: [],
      savedPlaylists: [],
      savedSources: [],
      tree: {
        fileLinks: [{ ...TREE.fileLinks[0], parentFolderId: 'folder-sets' }],
        folders: [
          LIBRARY_ROOT_FOLDER,
          {
            createdAt: '2026-05-10T10:00:00.000Z',
            id: 'folder-sets',
            name: 'Sets',
            parentFolderId: 'folder:library-root',
          },
        ],
        rootFolderId: 'folder:library-root',
        version: 1,
      },
    });
    const [folder] = state.rows;

    assert.equal(folder?.kind, 'folder');
    assert.equal(folder?.supportingLabel, '1 composite');
  });

  it('finds a composite in search by its name or a stem name', () => {
    const base = {
      entityFilter: 'all' as const,
      searchScope: 'all-files' as const,
      selectedTagFilters: [],
      tagFilterMatchMode: 'all' as const,
    };

    assert.equal(
      buildState({ ...base, activeSearchQuery: 'ubi' }).rows.length,
      1,
    );
    assert.equal(
      buildState({ ...base, activeSearchQuery: 'bass' }).rows.length,
      1,
    );
    assert.equal(
      buildState({ ...base, activeSearchQuery: 'tenor' }).rows.length,
      0,
    );
  });

  it('shows only composites under the Composites type filter', () => {
    const state = buildState({
      activeSearchQuery: null,
      entityFilter: 'composites',
      searchScope: 'all-files',
      selectedTagFilters: [],
      tagFilterMatchMode: 'all',
    });

    assert.deepEqual(
      state.rows.map((row) => row.kind),
      ['composite'],
    );
  });

  it('hides composites under another type filter or a tag filter', () => {
    const base = {
      activeSearchQuery: null,
      searchScope: 'all-files' as const,
      tagFilterMatchMode: 'all' as const,
    };

    assert.equal(
      buildState({
        ...base,
        entityFilter: 'tracks',
        selectedTagFilters: [],
      }).rows.length,
      0,
    );
    assert.equal(
      buildState({
        ...base,
        entityFilter: 'all',
        selectedTagFilters: ['alto'],
      }).rows.length,
      0,
    );
  });
});
