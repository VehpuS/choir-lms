import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  AsyncStoragePracticeRepository,
  REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
} from '@org/audio-library-runtime';
import type {
  DriveEnumeratedAudioSource,
  DriveEnumeratedFolder,
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

const OWNER_ID = 'drive-import-executor-user';
const CREATED_AT = '2026-09-10T12:00:00.000Z';
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

const asEnumeratedAudio = (
  source: ReturnType<typeof createAudio>,
): DriveEnumeratedAudioSource => source as DriveEnumeratedAudioSource;

describe('executeDriveImportPlan', () => {
  it('uses bounded Drive reads and serial writes to create folders, sources, and links', async () => {
    const repository = new AsyncStoragePracticeRepository();
    const rootFolder = createFolder('drive-folder-root', 'Warmups');
    const descendantFolder: DriveEnumeratedFolder = {
      ...createFolder('drive-folder-child', 'Soprano'),
      parentFolderId: rootFolder.id,
    };
    const reusableSource = asEnumeratedAudio(
      createAudio('drive-reusable', 'Reusable.mp3', rootFolder.id),
    );
    const newSources = [
      asEnumeratedAudio(
        createAudio('drive-new-1', 'One.mp3', descendantFolder.id),
      ),
      asEnumeratedAudio(
        createAudio('drive-new-2', 'Two.mp3', descendantFolder.id),
      ),
    ];
    await repository.saveSource(OWNER_ID, reusableSource);
    const plan = createDriveImportPlan({
      contentsByFolderId: new Map([
        [
          rootFolder.id,
          {
            folders: [descendantFolder],
            playableSources: [reusableSource, ...newSources],
            unavailableSources: [],
          },
        ],
      ]),
      destinationFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      libraryState: await createPlanState(repository),
      mode: 'preserve-structure',
      selection: createSelection({ folders: [rootFolder] }),
    });
    let activeReads = 0;
    let maximumActiveReads = 0;
    const progressPhases: string[] = [];
    const result = await executeDriveImportPlan({
      async loadDriveSource(source) {
        activeReads += 1;
        maximumActiveReads = Math.max(maximumActiveReads, activeReads);
        await new Promise((resolve) => setImmediate(resolve));
        activeReads -= 1;
        return source;
      },
      maxConcurrentDriveReads: 2,
      now: () => CREATED_AT,
      onProgress: ({ phase }) => progressPhases.push(phase),
      ownerId: OWNER_ID,
      plan,
      repository,
    });
    const tree = await repository.listLibraryFileTree(OWNER_ID);

    assert.equal(maximumActiveReads, 2);
    assert.equal(tree.folders.length, 3);
    assert.equal(tree.fileLinks.length, 4);
    assert.equal((await repository.listSources(OWNER_ID)).length, 3);
    assert.equal(result.summary.counts.reused, 1);
    assert.equal(result.summary.counts.created, 7);
    assert.equal(result.summary.status, 'completed');
    assert.deepEqual(
      [...new Set(progressPhases)],
      ['creating-folders', 'saving-sources', 'linking-tracks'],
    );
  });

  it('continues a sibling branch when one planned folder cannot be written', async () => {
    const baseRepository = new AsyncStoragePracticeRepository();
    const failedRoot = createFolder('drive-folder-failed', 'Failed branch');
    const successfulRoot = createFolder(
      'drive-folder-success',
      'Successful branch',
    );
    const plan = createDriveImportPlan({
      contentsByFolderId: new Map([
        [
          failedRoot.id,
          {
            folders: [],
            playableSources: [
              asEnumeratedAudio(
                createAudio('drive-failed-track', 'Failed.mp3', failedRoot.id),
              ),
            ],
            unavailableSources: [],
          },
        ],
        [
          successfulRoot.id,
          {
            folders: [],
            playableSources: [
              asEnumeratedAudio(
                createAudio(
                  'drive-success-track',
                  'Success.mp3',
                  successfulRoot.id,
                ),
              ),
            ],
            unavailableSources: [],
          },
        ],
      ]),
      destinationFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      libraryState: await createPlanState(baseRepository),
      mode: 'preserve-structure',
      selection: createSelection({ folders: [failedRoot, successfulRoot] }),
    });
    const failedLibraryFolderId = plan.folders.find(
      ({ folder }) => folder.id === failedRoot.id,
    )?.libraryFolderId;
    const repository = {
      saveLibraryFileLink:
        baseRepository.saveLibraryFileLink.bind(baseRepository),
      async saveLibraryFolderNode(
        ownerId: string,
        folder: Parameters<
          AsyncStoragePracticeRepository['saveLibraryFolderNode']
        >[1],
      ) {
        if (folder.id === failedLibraryFolderId) {
          throw new Error('Injected folder write failure.');
        }
        return baseRepository.saveLibraryFolderNode(ownerId, folder);
      },
      saveSource: baseRepository.saveSource.bind(baseRepository),
    };
    const result = await executeDriveImportPlan({
      loadDriveSource: async (source) => source,
      now: () => CREATED_AT,
      ownerId: OWNER_ID,
      plan,
      repository,
    });
    const tree = await baseRepository.listLibraryFileTree(OWNER_ID);

    assert.equal((await baseRepository.listSources(OWNER_ID)).length, 1);
    assert.equal(
      tree.folders.some(({ id }) => id === failedLibraryFolderId),
      false,
    );
    assert.equal(
      tree.folders.some(({ name }) => name === successfulRoot.name),
      true,
    );
    assert.deepEqual(
      tree.fileLinks.map(({ entityId }) => entityId),
      ['drive:drive-success-track'],
    );
    assert.equal(result.summary.counts.failed, 3);
    assert.equal(result.summary.counts.created, 3);
    assert.equal(result.summary.status, 'partial-failure');
  });
});
