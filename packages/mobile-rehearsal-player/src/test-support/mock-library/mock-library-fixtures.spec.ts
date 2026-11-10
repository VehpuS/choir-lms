import { storageKey } from '@org/audio-library-runtime';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildDefaultMockLibrary,
  buildMockLibraryStorageEntries,
  MOCK_LIBRARY_OWNER_ID,
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
