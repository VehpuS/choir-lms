import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';

import { buildLibraryBundle } from './library-bundle-builder.ts';
import {
  executeLibraryBundleImport,
  type LibraryBundleImportRepository,
} from './library-bundle-import-executor.ts';
import {
  planLibraryBundleImport,
  type LibraryBundleImportPlan,
} from './library-bundle-import-plan.ts';
import { AT, input } from './library-bundle-test-fixtures.ts';
import { resetLibraryReplaceRecoveryChecks } from './library-replace-storage.ts';
import { AsyncStoragePracticeRepository } from './rehearsal-playback.js';

const mutableAsyncStorage = AsyncStorage as unknown as AsyncStorageStatic;
const ORIGINAL = {
  getItem: mutableAsyncStorage.getItem,
  removeItem: mutableAsyncStorage.removeItem,
  setItem: mutableAsyncStorage.setItem,
};
const OWNER_ID = 'user-1';
const ROOT = 'folder:library-root';
const IMPORTED_AT = '2026-12-01T09:00:00.000Z';

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

const planFor = async (repository: AsyncStoragePracticeRepository) => {
  const { bundle } = buildLibraryBundle({
    input: input(),
    scope: { kind: 'library' },
    author: { name: 'Dana' },
    createdAt: AT,
  });

  return planLibraryBundleImport({
    bundle,
    bundleName: 'backup.json',
    destinationFolderId: ROOT,
    importId: 'imp1',
    importedAt: IMPORTED_AT,
    ownerId: OWNER_ID,
    state: {
      entityCollections: {
        sources: await repository.listSources(OWNER_ID),
        loops: await repository.listLoops(OWNER_ID),
        playlists: await repository.listPlaylists(OWNER_ID),
        composites: await repository.listComposites(OWNER_ID),
      },
      tree: await repository.listLibraryFileTree(OWNER_ID),
    },
  });
};

const failingOn = (
  repository: AsyncStoragePracticeRepository,
  failingKey: 'loops' | 'tree' | null,
): LibraryBundleImportRepository => ({
  importLibraryEntities: async (ownerId, entities) => {
    if (failingKey === 'loops' && entities.loops) {
      throw new Error('disk full');
    }

    await repository.importLibraryEntities(ownerId, entities);
  },
  importLibraryTreeNodes: async (ownerId, nodes) => {
    if (failingKey === 'tree') {
      throw new Error('disk full');
    }

    return repository.importLibraryTreeNodes(ownerId, nodes);
  },
});

describe('executeLibraryBundleImport', () => {
  it('writes every phase in order and reports progress', async () => {
    useMemoryStorage();

    const repository = new AsyncStoragePracticeRepository();
    const plan = await planFor(repository);
    const phases: string[] = [];
    const result = await executeLibraryBundleImport({
      ownerId: OWNER_ID,
      plan,
      repository,
      onProgress: ({ phase, totalPhases }) =>
        phases.push(`${phase}/${totalPhases}`),
    });

    assert.equal(result.status, 'completed');
    assert.deepEqual(phases, [
      'tracks/5',
      'composites/5',
      'loops/5',
      'playlists/5',
      'tree/5',
    ]);
    assert.equal((await repository.listSources(OWNER_ID)).length, 4);
    assert.equal((await repository.listLoops(OWNER_ID)).length, 2);
    assert.equal((await repository.listPlaylists(OWNER_ID)).length, 1);
    assert.equal((await repository.listComposites(OWNER_ID)).length, 2);
  });

  it('keeps imported items in the import folder only, not also at the library root', async () => {
    useMemoryStorage();

    const repository = new AsyncStoragePracticeRepository();
    const plan = await planFor(repository);

    await executeLibraryBundleImport({ ownerId: OWNER_ID, plan, repository });

    const tree = await repository.listLibraryFileTree(OWNER_ID);
    const atRoot = tree.fileLinks.filter(
      (link) => link.parentFolderId === ROOT,
    );

    assert.deepEqual(atRoot, []);
    assert.equal(tree.fileLinks.length, plan.fileLinks.length);
    assert.equal(
      tree.folders.find((f) => f.id === plan.rootFolder.id)?.importedFrom
        ?.author,
      'Dana',
    );
  });

  it('stops at the first failure, skips the rest and leaves a valid library', async () => {
    useMemoryStorage();

    const repository = new AsyncStoragePracticeRepository();
    const result = await executeLibraryBundleImport({
      ownerId: OWNER_ID,
      plan: await planFor(repository),
      repository: failingOn(repository, 'loops'),
    });

    assert.equal(result.status, 'failed');
    assert.deepEqual(
      result.outcomes.map(({ phase, status }) => `${phase}:${status}`),
      [
        'tracks:done',
        'composites:done',
        'loops:failed',
        'playlists:skipped',
        'tree:skipped',
      ],
    );
    assert.equal(result.outcomes[2].error, 'disk full');
    // Tracks and composites are in; the tree still reads cleanly with default links.
    assert.equal((await repository.listSources(OWNER_ID)).length, 4);
    assert.equal(
      (await repository.listLibraryFileTree(OWNER_ID)).rootFolderId,
      ROOT,
    );
  });

  it('resumes after a failure without duplicating or leaving root links', async () => {
    useMemoryStorage();

    const repository = new AsyncStoragePracticeRepository();

    await executeLibraryBundleImport({
      ownerId: OWNER_ID,
      plan: await planFor(repository),
      repository: failingOn(repository, 'loops'),
    });

    const retryPlan: LibraryBundleImportPlan = await planFor(repository);
    const retry = await executeLibraryBundleImport({
      ownerId: OWNER_ID,
      plan: retryPlan,
      repository,
    });

    assert.equal(retry.status, 'completed');
    assert.equal(retryPlan.newSources.length, 0);
    assert.equal(retryPlan.summary.alreadyImported >= 4, true);
    assert.equal((await repository.listSources(OWNER_ID)).length, 4);
    assert.equal((await repository.listLoops(OWNER_ID)).length, 2);
    assert.equal((await repository.listComposites(OWNER_ID)).length, 2);

    const tree = await repository.listLibraryFileTree(OWNER_ID);

    assert.deepEqual(
      tree.fileLinks.filter((link) => link.parentFolderId === ROOT),
      [],
    );
  });

  it('stops before the next phase when cancelled', async () => {
    useMemoryStorage();

    const repository = new AsyncStoragePracticeRepository();
    const controller = new AbortController();
    const result = await executeLibraryBundleImport({
      ownerId: OWNER_ID,
      plan: await planFor(repository),
      repository,
      signal: controller.signal,
      onProgress: ({ phase }) => {
        if (phase === 'composites') {
          controller.abort();
        }
      },
    });

    assert.equal(result.status, 'cancelled');
    assert.deepEqual(
      result.outcomes.map(({ status }) => status),
      ['done', 'done', 'cancelled', 'cancelled', 'cancelled'],
    );
  });
});
