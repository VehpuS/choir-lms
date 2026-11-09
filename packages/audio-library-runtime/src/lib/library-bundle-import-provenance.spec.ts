import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';

import { buildLibraryBundle } from './library-bundle-builder.ts';
import { planLibraryBundleImport } from './library-bundle-import-plan.ts';
import { AT, input } from './library-bundle-test-fixtures.ts';
import { AsyncStoragePracticeRepository } from './rehearsal-playback.js';

const mutableAsyncStorage = AsyncStorage as unknown as AsyncStorageStatic;
const ORIGINAL = {
  getItem: mutableAsyncStorage.getItem,
  removeItem: mutableAsyncStorage.removeItem,
  setItem: mutableAsyncStorage.setItem,
};
const OWNER_ID = 'user-1';
const ROOT = 'folder:library-root';

afterEach(() => {
  mutableAsyncStorage.getItem = ORIGINAL.getItem;
  mutableAsyncStorage.removeItem = ORIGINAL.removeItem;
  mutableAsyncStorage.setItem = ORIGINAL.setItem;
});

describe('imported provenance in storage', () => {
  it('survives a save and a reload for every kind of entity the import creates', async () => {
    const storage = new Map<string, string>();

    mutableAsyncStorage.getItem = async (key) => storage.get(key) ?? null;
    mutableAsyncStorage.removeItem = async (key) => {
      storage.delete(key);
    };
    mutableAsyncStorage.setItem = async (key, value) => {
      storage.set(key, value);
    };

    const repository = new AsyncStoragePracticeRepository();
    const { bundle } = buildLibraryBundle({
      input: input(),
      scope: { kind: 'library' },
      author: { name: 'Dana' },
      createdAt: AT,
    });
    const tree = await repository.listLibraryFileTree(OWNER_ID);
    const plan = planLibraryBundleImport({
      bundle,
      bundleName: 'backup.json',
      destinationFolderId: ROOT,
      importId: 'imp1',
      importedAt: '2026-12-01T09:00:00.000Z',
      ownerId: OWNER_ID,
      state: {
        entityCollections: {
          sources: [],
          loops: [],
          playlists: [],
          composites: [],
        },
        tree,
      },
    });

    for (const source of plan.newSources) {
      await repository.saveSource(OWNER_ID, source);
    }
    for (const loop of plan.loops) {
      await repository.saveLoop(loop);
    }
    for (const playlist of plan.playlists) {
      await repository.savePlaylist(playlist);
    }
    await repository.saveLibraryFolderNode(OWNER_ID, plan.rootFolder);

    const sources = await repository.listSources(OWNER_ID);
    const loops = await repository.listLoops(OWNER_ID);
    const playlists = await repository.listPlaylists(OWNER_ID);
    const reloadedTree = await repository.listLibraryFileTree(OWNER_ID);

    assert.equal(
      sources.every((s) => s.importedFrom?.author === 'Dana'),
      true,
    );
    assert.equal(
      loops.every((l) => l.importedFrom?.bundleName === 'backup.json'),
      true,
    );
    assert.equal(
      playlists.every((p) => p.importedFrom !== undefined),
      true,
    );
    assert.equal(
      reloadedTree.folders.find((f) => f.id === plan.rootFolder.id)
        ?.importedFrom?.author,
      'Dana',
    );
  });
});
