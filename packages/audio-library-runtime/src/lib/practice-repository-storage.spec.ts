import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { createPlaylist } from '@org/audio-library-models';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';

import {
  loadCanonicalCollections,
  persistSynchronizedLibraryFileTree,
  writeStoredLibraryFileTree,
} from './practice-repository-storage';
import { REHEARSAL_LIBRARY_ROOT_FOLDER_ID } from './rehearsal-library-files';

const mutableAsyncStorage = AsyncStorage as unknown as AsyncStorageStatic;

const ORIGINAL_ASYNC_STORAGE = {
  getItem: mutableAsyncStorage.getItem,
  setItem: mutableAsyncStorage.setItem,
};

const wait = (delayMs: number) => {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
};

/**
 * Delays reads less than writes so that, without serialization, a
 * concurrently-dispatched read reliably finishes and returns before a
 * slower write has landed — reproducing the timing that let a `refresh()`
 * read start before a concurrent mutation's write and still resolve first.
 */
const configureDelayedTestStorage = (storage: Map<string, string>) => {
  let concurrentLibraryTreeCalls = 0;
  let maxConcurrentLibraryTreeCalls = 0;

  mutableAsyncStorage.getItem = async (key) => {
    const isLibraryTreeKey = key.includes('library-tree');

    if (isLibraryTreeKey) {
      concurrentLibraryTreeCalls += 1;
      maxConcurrentLibraryTreeCalls = Math.max(
        maxConcurrentLibraryTreeCalls,
        concurrentLibraryTreeCalls,
      );
    }

    await wait(2);

    if (isLibraryTreeKey) {
      concurrentLibraryTreeCalls -= 1;
    }

    return storage.get(key) ?? null;
  };
  mutableAsyncStorage.setItem = async (key, value) => {
    const isLibraryTreeKey = key.includes('library-tree');

    if (isLibraryTreeKey) {
      concurrentLibraryTreeCalls += 1;
      maxConcurrentLibraryTreeCalls = Math.max(
        maxConcurrentLibraryTreeCalls,
        concurrentLibraryTreeCalls,
      );
    }

    await wait(20);
    storage.set(key, value);

    if (isLibraryTreeKey) {
      concurrentLibraryTreeCalls -= 1;
    }
  };

  return {
    getMaxConcurrentLibraryTreeCalls: () => maxConcurrentLibraryTreeCalls,
  };
};

afterEach(() => {
  mutableAsyncStorage.getItem = ORIGINAL_ASYNC_STORAGE.getItem;
  mutableAsyncStorage.setItem = ORIGINAL_ASYNC_STORAGE.setItem;
});

const CANONICAL_COLLECTION_READER = {
  async listLoops() {
    return [];
  },
  async listPlaylists() {
    return [PLAYLIST];
  },
  async listSources() {
    return [];
  },
};

const PLAYLIST = createPlaylist({
  name: 'Repro Playlist',
  ownerId: 'owner-1',
});

describe('practice-repository-storage library file tree serialization', () => {
  it('never overlaps concurrent reads/writes to the same owner file tree', async () => {
    const storage = new Map<string, string>();
    const { getMaxConcurrentLibraryTreeCalls } =
      configureDelayedTestStorage(storage);

    await Promise.all([
      persistSynchronizedLibraryFileTree(
        CANONICAL_COLLECTION_READER,
        'owner-1',
      ),
      persistSynchronizedLibraryFileTree(
        CANONICAL_COLLECTION_READER,
        'owner-1',
      ),
      persistSynchronizedLibraryFileTree(
        CANONICAL_COLLECTION_READER,
        'owner-1',
      ),
    ]);

    assert.equal(getMaxConcurrentLibraryTreeCalls(), 1);
  });

  it('does not let a concurrent refresh revert a file link move that already wrote to storage', async () => {
    const storage = new Map<string, string>();
    configureDelayedTestStorage(storage);

    const entityCollections = await loadCanonicalCollections(
      CANONICAL_COLLECTION_READER,
      'owner-1',
    );

    const baseTree = await persistSynchronizedLibraryFileTree(
      CANONICAL_COLLECTION_READER,
      'owner-1',
      entityCollections,
    );
    const playlistLink = baseTree.fileLinks.find(
      (fileLink) => fileLink.entityId === PLAYLIST.id,
    );

    assert.ok(playlistLink);
    assert.equal(playlistLink.parentFolderId, REHEARSAL_LIBRARY_ROOT_FOLDER_ID);

    const nestedFolderId = 'folder:nested';
    const movedTree = {
      ...baseTree,
      folders: [
        ...baseTree.folders,
        {
          id: nestedFolderId,
          name: 'Nested',
          parentFolderId: baseTree.rootFolderId,
          createdAt: '2026-05-10T10:00:00.000Z',
        },
      ],
    };
    const movedTreeWithLink = {
      ...movedTree,
      fileLinks: movedTree.fileLinks.map((fileLink) => {
        return fileLink.id === playlistLink.id
          ? { ...fileLink, parentFolderId: nestedFolderId }
          : fileLink;
      }),
    };

    // Dispatch the explicit "move" write and a "refresh" read back to back,
    // synchronously and unawaited, in the same order the Files create-in-
    // folder move and the canonicalIdsKey-triggered refresh raced in the
    // reported bug. Without serialization, the refresh's read can still
    // land before the move's write completes and return stale data even
    // though it was dispatched second.
    const movePromise = writeStoredLibraryFileTree('owner-1', movedTreeWithLink);
    const refreshPromise = persistSynchronizedLibraryFileTree(
      CANONICAL_COLLECTION_READER,
      'owner-1',
      entityCollections,
    );

    const [moveResult, refreshResult] = await Promise.all([
      movePromise,
      refreshPromise,
    ]);

    const moveResultLink = moveResult.fileLinks.find(
      (fileLink) => fileLink.id === playlistLink.id,
    );
    const refreshResultLink = refreshResult.fileLinks.find(
      (fileLink) => fileLink.id === playlistLink.id,
    );

    assert.ok(moveResultLink);
    assert.equal(moveResultLink.parentFolderId, nestedFolderId);

    // The refresh was dispatched after the move, so it must observe the
    // move's effect rather than returning a stale, pre-move snapshot.
    assert.ok(refreshResultLink);
    assert.equal(refreshResultLink.parentFolderId, nestedFolderId);
  });
});
