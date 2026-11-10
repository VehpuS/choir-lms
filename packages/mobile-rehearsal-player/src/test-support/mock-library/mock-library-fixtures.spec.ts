import {
  libraryFileTreeStorageKey,
  REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
  storageKey,
} from '@org/audio-library-runtime';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildDefaultMockLibrary,
  buildMockLibraryStorageEntries,
  buildTrackRenameMockLibrary,
  MOCK_LIBRARY_OWNER_ID,
  MOCK_LIBRARY_ROOT_FOLDER_ID,
} from './mock-library-fixtures';

describe('buildMockLibraryStorageEntries', () => {
  it('uses the storage keys the runtime reads the library from', () => {
    const entries = buildMockLibraryStorageEntries(buildDefaultMockLibrary());

    assert.deepEqual(Object.keys(entries).sort(), [
      storageKey('playlists', MOCK_LIBRARY_OWNER_ID),
      storageKey('sources', MOCK_LIBRARY_OWNER_ID),
    ]);
  });

  it('serializes the library as JSON arrays', () => {
    const library = buildDefaultMockLibrary();
    const entries = buildMockLibraryStorageEntries(library);

    assert.deepEqual(
      JSON.parse(entries[storageKey('sources', MOCK_LIBRARY_OWNER_ID)]),
      library.sources,
    );
  });
});

describe('mock library file tree', () => {
  it('keeps the root folder id and tree key in step with the runtime', () => {
    assert.equal(MOCK_LIBRARY_ROOT_FOLDER_ID, REHEARSAL_LIBRARY_ROOT_FOLDER_ID);

    const entries = buildMockLibraryStorageEntries(
      buildTrackRenameMockLibrary(),
    );
    const tree = JSON.parse(
      entries[libraryFileTreeStorageKey(MOCK_LIBRARY_OWNER_ID)],
    );

    assert.equal(tree.rootFolderId, REHEARSAL_LIBRARY_ROOT_FOLDER_ID);
    assert.equal(tree.folders.length, 3);
    assert.equal(tree.fileLinks.length, 4);
  });

  it('seeds no tree for a library without folders or copies', () => {
    const entries = buildMockLibraryStorageEntries(buildDefaultMockLibrary());

    assert.equal(
      entries[libraryFileTreeStorageKey(MOCK_LIBRARY_OWNER_ID)],
      undefined,
    );
  });
});
