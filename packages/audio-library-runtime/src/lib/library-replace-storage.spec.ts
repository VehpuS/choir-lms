import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  createDriveAudioSource,
  type DriveAudioSource,
} from '@org/audio-library-models';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';

import {
  replaceLibraryStorage,
  resetLibraryReplaceRecoveryChecks,
  type ReplacementLibraryState,
} from './library-replace-storage.ts';
import { AsyncStoragePracticeRepository } from './rehearsal-playback.js';

const mutableAsyncStorage = AsyncStorage as unknown as AsyncStorageStatic;
const ORIGINAL = {
  getItem: mutableAsyncStorage.getItem,
  removeItem: mutableAsyncStorage.removeItem,
  setItem: mutableAsyncStorage.setItem,
};
const OWNER_ID = 'user-1';
const ROOT = 'folder:library-root';
const AT = '2026-11-09T10:00:00.000Z';

const track = (driveFileId: string, name: string): DriveAudioSource =>
  createDriveAudioSource({
    driveFileId,
    name,
    mimeType: 'audio/mpeg',
    createdAt: AT,
    availability: { status: 'available' },
  });

const useMemoryStorage = () => {
  const storage = new Map<string, string>();

  resetLibraryReplaceRecoveryChecks();
  mutableAsyncStorage.getItem = async (key) => storage.get(key) ?? null;
  mutableAsyncStorage.removeItem = async (key) => {
    storage.delete(key);
  };
  mutableAsyncStorage.setItem = async (key, value) => {
    storage.set(key, value);
  };

  return storage;
};

afterEach(() => {
  mutableAsyncStorage.getItem = ORIGINAL.getItem;
  mutableAsyncStorage.removeItem = ORIGINAL.removeItem;
  mutableAsyncStorage.setItem = ORIGINAL.setItem;
});

const replacement = (sources: DriveAudioSource[]): ReplacementLibraryState => ({
  sources,
  loops: [],
  playlists: [],
  composites: [],
  tree: {
    version: 1,
    rootFolderId: ROOT,
    folders: [
      { id: ROOT, name: 'Library', parentFolderId: null, createdAt: AT },
    ],
    fileLinks: sources.map((source) => ({
      id: `link-${source.id}`,
      parentFolderId: ROOT,
      entityKind: 'track' as const,
      entityId: source.id,
    })),
  },
});

const seed = async (names: string[]) => {
  const repository = new AsyncStoragePracticeRepository();

  for (const name of names) {
    await repository.saveSource(OWNER_ID, track(`d-${name}`, name));
  }

  return repository;
};

const names = async (repository: AsyncStoragePracticeRepository) =>
  (await repository.listSources(OWNER_ID)).map((source) => source.name);

describe('replaceLibrary', () => {
  it('swaps the whole library, tree included, and reports the tracks that went away', async () => {
    const storage = useMemoryStorage();
    const repository = await seed(['Old A', 'Old B']);

    storage.set('choirlms:peaks:cache', 'derived');

    const { removedSourceIds } = await repository.replaceLibrary(
      OWNER_ID,
      replacement([track('d-new', 'New')]),
    );

    assert.deepEqual(await names(repository), ['New']);
    assert.deepEqual(removedSourceIds.sort(), [
      'drive:d-Old A',
      'drive:d-Old B',
    ]);
    assert.deepEqual(
      (await repository.listLibraryFileTree(OWNER_ID)).fileLinks.map(
        (l) => l.entityId,
      ),
      ['drive:d-new'],
    );
    // Derived caches and staging are left clean or untouched.
    assert.equal(storage.get('choirlms:peaks:cache'), 'derived');
    assert.deepEqual(
      [...storage.keys()].filter(
        (key) => key.includes('staging') || key.includes('replace-marker'),
      ),
      [],
    );
  });

  it('finishes a swap that was interrupted after it committed', async () => {
    const storage = useMemoryStorage();
    const repository = await seed(['Old']);

    await assert.rejects(
      replaceLibraryStorage(OWNER_ID, replacement([track('d-new', 'New')]), {
        afterCommit: () => {
          throw new Error('app killed');
        },
      }),
      /app killed/,
    );

    // Nothing has been swapped yet, the marker and staging are on disk.
    assert.equal(
      storage.has(`choirlms:practice:replace-marker:${OWNER_ID}`),
      true,
    );

    resetLibraryReplaceRecoveryChecks(); // a new app start

    assert.deepEqual(await names(repository), ['New']);
    assert.equal(
      storage.has(`choirlms:practice:replace-marker:${OWNER_ID}`),
      false,
    );
  });

  it('rolls back staged values when the app died before the commit', async () => {
    const storage = useMemoryStorage();
    const repository = await seed(['Old']);

    storage.set(
      `choirlms:practice:sources:${OWNER_ID}:staging`,
      JSON.stringify([track('d-half', 'Half written')]),
    );
    resetLibraryReplaceRecoveryChecks();

    assert.deepEqual(await names(repository), ['Old']);
    assert.equal(
      storage.has(`choirlms:practice:sources:${OWNER_ID}:staging`),
      false,
    );
  });

  it('can finish the same swap twice without harm', async () => {
    const storage = useMemoryStorage();
    const repository = await seed(['Old']);

    await replaceLibraryStorage(
      OWNER_ID,
      replacement([track('d-new', 'New')]),
      {
        afterCommit: () => {
          throw new Error('killed again');
        },
      },
    ).catch(() => undefined);

    resetLibraryReplaceRecoveryChecks();
    await names(repository);
    resetLibraryReplaceRecoveryChecks();

    assert.deepEqual(await names(repository), ['New']);
    assert.equal(
      storage.has(`choirlms:practice:replace-marker:${OWNER_ID}`),
      false,
    );
  });
});
