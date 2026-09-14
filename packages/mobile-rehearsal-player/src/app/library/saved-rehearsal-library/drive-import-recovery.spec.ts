import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  AsyncStoragePracticeRepository,
  REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
} from '@org/audio-library-runtime';
import type {
  DriveAudioDiscoveryResult,
  DriveEnumeratedAudioSource,
} from '@org/google-drive';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';

import { executeDriveImportPlan } from './drive-import-executor.js';
import {
  createAudio,
  createFolder,
  createSelection,
} from './drive-import-planner-test-fixtures.js';
import { createDriveImportPlan } from './drive-import-planner.js';
import { createDriveImportRetryPlan } from './drive-import-retry-planner.js';

const OWNER_ID = 'drive-import-recovery-user';
const CREATED_AT = '2026-09-14T12:00:00.000Z';
const mutableAsyncStorage = AsyncStorage as unknown as AsyncStorageStatic;
const originalAsyncStorage = {
  getItem: mutableAsyncStorage.getItem,
  removeItem: mutableAsyncStorage.removeItem,
  setItem: mutableAsyncStorage.setItem,
};

beforeEach(() => {
  const store = new Map<string, string>();
  mutableAsyncStorage.getItem = async (key) => store.get(key) ?? null;
  mutableAsyncStorage.removeItem = async (key) => {
    store.delete(key);
  };
  mutableAsyncStorage.setItem = async (key, value) => {
    store.set(key, value);
  };
});

afterEach(() => {
  mutableAsyncStorage.getItem = originalAsyncStorage.getItem;
  mutableAsyncStorage.removeItem = originalAsyncStorage.removeItem;
  mutableAsyncStorage.setItem = originalAsyncStorage.setItem;
});

const createPlanState = async (repository: AsyncStoragePracticeRepository) => ({
  entityCollections: {
    loops: await repository.listLoops(OWNER_ID),
    playlists: await repository.listPlaylists(OWNER_ID),
    sources: await repository.listSources(OWNER_ID),
  },
  tree: await repository.listLibraryFileTree(OWNER_ID),
});

const asDiscoveredAudio = (
  source: ReturnType<typeof createAudio>,
): DriveAudioDiscoveryResult => source as DriveAudioDiscoveryResult;

const asEnumeratedAudio = (
  source: ReturnType<typeof createAudio>,
): DriveEnumeratedAudioSource => source as DriveEnumeratedAudioSource;

describe('Drive import cancellation and retry', () => {
  it('stops scheduling Drive reads after cancellation and reports untouched work', async () => {
    const repository = new AsyncStoragePracticeRepository();
    const controller = new AbortController();
    const sources = [
      asDiscoveredAudio(createAudio('drive-one', 'One.mp3')),
      asDiscoveredAudio(createAudio('drive-two', 'Two.mp3')),
      asDiscoveredAudio(createAudio('drive-three', 'Three.mp3')),
    ];
    const plan = createDriveImportPlan({
      contentsByFolderId: new Map(),
      destinationFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      libraryState: await createPlanState(repository),
      mode: 'flatten',
      selection: createSelection({ audio: sources }),
    });
    let driveReads = 0;
    const result = await executeDriveImportPlan({
      async loadDriveSource(source) {
        driveReads += 1;
        controller.abort();
        return source;
      },
      maxConcurrentDriveReads: 1,
      ownerId: OWNER_ID,
      plan,
      repository,
      signal: controller.signal,
    });

    assert.equal(driveReads, 1);
    assert.equal((await repository.listSources(OWNER_ID)).length, 0);
    assert.equal(result.summary.counts.cancelled, 6);
    assert.equal(result.summary.status, 'cancelled');
  });

  it('retains completed writes and retries only cancelled work idempotently', async () => {
    const repository = new AsyncStoragePracticeRepository();
    const controller = new AbortController();
    const rootFolder = createFolder('drive-folder-root', 'Warmups');
    const sources = [
      asEnumeratedAudio(createAudio('drive-one', 'One.mp3', rootFolder.id)),
      asEnumeratedAudio(createAudio('drive-two', 'Two.mp3', rootFolder.id)),
      asEnumeratedAudio(createAudio('drive-three', 'Three.mp3', rootFolder.id)),
    ];
    const plan = createDriveImportPlan({
      contentsByFolderId: new Map([
        [
          rootFolder.id,
          {
            folders: [],
            playableSources: sources,
            unavailableSources: [],
          },
        ],
      ]),
      destinationFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      libraryState: await createPlanState(repository),
      mode: 'preserve-structure',
      selection: createSelection({ folders: [rootFolder] }),
    });
    const cancellingRepository = {
      saveLibraryFileLink: repository.saveLibraryFileLink.bind(repository),
      saveLibraryFolderNode: repository.saveLibraryFolderNode.bind(repository),
      async saveSource(
        ...args: Parameters<AsyncStoragePracticeRepository['saveSource']>
      ) {
        const savedSources = await repository.saveSource(...args);

        if (args[2]?.fileLink) {
          controller.abort();
        }
        return savedSources;
      },
    };
    const cancelledResult = await executeDriveImportPlan({
      loadDriveSource: async (source) => source,
      now: () => CREATED_AT,
      ownerId: OWNER_ID,
      plan,
      repository: cancellingRepository,
      signal: controller.signal,
    });

    assert.equal((await repository.listSources(OWNER_ID)).length, 1);
    assert.equal(
      (await repository.listLibraryFileTree(OWNER_ID)).fileLinks.length,
      1,
    );
    assert.equal(cancelledResult.summary.counts.cancelled, 4);

    const retryPlan = createDriveImportRetryPlan({
      libraryState: await createPlanState(repository),
      outcomes: cancelledResult.outcomes,
      plan,
    });
    assert.equal(retryPlan.folders.length, 0);
    assert.equal(retryPlan.tracks.length, 2);

    const retryResult = await executeDriveImportPlan({
      loadDriveSource: async (source) => source,
      now: () => CREATED_AT,
      ownerId: OWNER_ID,
      plan: retryPlan,
      repository,
    });
    const completedTree = await repository.listLibraryFileTree(OWNER_ID);

    assert.equal((await repository.listSources(OWNER_ID)).length, 3);
    assert.equal(completedTree.folders.length, 2);
    assert.equal(completedTree.fileLinks.length, 3);
    assert.equal(retryResult.summary.status, 'completed');

    const emptyRetryPlan = createDriveImportRetryPlan({
      libraryState: await createPlanState(repository),
      outcomes: retryResult.outcomes,
      plan: retryPlan,
    });
    assert.equal(emptyRetryPlan.folders.length, 0);
    assert.equal(emptyRetryPlan.tracks.length, 0);
  });

  it('replans only a failed track after its sibling completes', async () => {
    const repository = new AsyncStoragePracticeRepository();
    const sources = [
      asDiscoveredAudio(createAudio('drive-failed-once', 'Retry me.mp3')),
      asDiscoveredAudio(createAudio('drive-success', 'Keep me.mp3')),
    ];
    const plan = createDriveImportPlan({
      contentsByFolderId: new Map(),
      destinationFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      libraryState: await createPlanState(repository),
      mode: 'flatten',
      selection: createSelection({ audio: sources }),
    });
    let shouldFail = true;
    const failingRepository = {
      saveLibraryFileLink: repository.saveLibraryFileLink.bind(repository),
      saveLibraryFolderNode: repository.saveLibraryFolderNode.bind(repository),
      async saveSource(
        ...args: Parameters<AsyncStoragePracticeRepository['saveSource']>
      ) {
        if (args[1].driveFileId === 'drive-failed-once' && shouldFail) {
          shouldFail = false;
          throw new Error('Injected one-time source failure.');
        }
        return repository.saveSource(...args);
      },
    };
    const failedResult = await executeDriveImportPlan({
      loadDriveSource: async (source) => source,
      ownerId: OWNER_ID,
      plan,
      repository: failingRepository,
    });

    assert.equal(failedResult.summary.status, 'partial-failure');
    assert.equal((await repository.listSources(OWNER_ID)).length, 1);

    const retryPlan = createDriveImportRetryPlan({
      libraryState: await createPlanState(repository),
      outcomes: failedResult.outcomes,
      plan,
    });
    assert.deepEqual(
      retryPlan.tracks.map(({ source }) => source.driveFileId),
      ['drive-failed-once'],
    );

    const retryResult = await executeDriveImportPlan({
      loadDriveSource: async (source) => source,
      ownerId: OWNER_ID,
      plan: retryPlan,
      repository,
    });
    const completedTree = await repository.listLibraryFileTree(OWNER_ID);

    assert.equal(retryResult.summary.status, 'completed');
    assert.equal((await repository.listSources(OWNER_ID)).length, 2);
    assert.equal(completedTree.fileLinks.length, 2);
  });
});
