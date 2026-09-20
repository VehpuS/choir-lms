import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { createDriveAudioSource } from '@org/audio-library-models';
import {
  AsyncStoragePracticeRepository,
  REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
} from '@org/audio-library-runtime';

import {
  asDiscoveredAudio,
  CREATED_AT,
  createPlanState,
  installMockAsyncStorage,
  OWNER_ID,
  restoreAsyncStorage,
} from './drive-import-recovery-test-fixtures.js';
import { executeDriveImportPlan } from './drive-import-executor.js';
import {
  createAudio,
  createSelection,
} from './drive-import-planner-test-fixtures.js';
import { createDriveImportPlan } from './drive-import-planner.js';
import { createDriveImportRetryPlan } from './drive-import-retry-planner.js';

beforeEach(() => {
  installMockAsyncStorage();
});

afterEach(() => {
  restoreAsyncStorage();
});

describe('Drive import retry classification', () => {
  it('excludes already-reused and already-present tracks from a retry plan', async () => {
    const repository = new AsyncStoragePracticeRepository();
    const otherFolder = {
      createdAt: CREATED_AT,
      id: 'other-folder',
      name: 'Other',
      parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
    };
    await repository.saveLibraryFolderNode(OWNER_ID, otherFolder);

    const alreadyPresentSource = createDriveAudioSource({
      availability: { status: 'available' },
      driveFileId: 'drive-already-present',
      mimeType: 'audio/mpeg',
      name: 'Already Present.mp3',
    });
    await repository.saveSource(OWNER_ID, alreadyPresentSource, {
      fileLink: {
        entityId: alreadyPresentSource.id,
        entityKind: 'track',
        id: 'existing-already-present-link',
        parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      },
    });

    const reusableSource = createDriveAudioSource({
      availability: { status: 'available' },
      driveFileId: 'drive-reusable',
      mimeType: 'audio/mpeg',
      name: 'Reusable.mp3',
    });
    await repository.saveSource(OWNER_ID, reusableSource, {
      fileLink: {
        entityId: reusableSource.id,
        entityKind: 'track',
        id: 'existing-reusable-link',
        parentFolderId: otherFolder.id,
      },
    });

    const sources = [
      asDiscoveredAudio(
        createAudio('drive-already-present', 'Already Present.mp3'),
      ),
      asDiscoveredAudio(createAudio('drive-reusable', 'Reusable.mp3')),
      asDiscoveredAudio(createAudio('drive-new-failure', 'New Failure.mp3')),
    ];
    const plan = createDriveImportPlan({
      contentsByFolderId: new Map(),
      destinationFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      libraryState: await createPlanState(repository),
      mode: 'flatten',
      selection: createSelection({ audio: sources }),
    });

    assert.deepEqual(
      plan.tracks
        .map(({ classification, source }) => ({
          classification,
          driveFileId: source.driveFileId,
        }))
        .sort((a, b) => a.driveFileId.localeCompare(b.driveFileId)),
      [
        {
          classification: 'already-present',
          driveFileId: 'drive-already-present',
        },
        { classification: 'new', driveFileId: 'drive-new-failure' },
        { classification: 'reusable', driveFileId: 'drive-reusable' },
      ],
    );

    const failingRepository = {
      saveLibraryFileLink: repository.saveLibraryFileLink.bind(repository),
      saveLibraryFolderNode: repository.saveLibraryFolderNode.bind(repository),
      async saveSource(
        ...args: Parameters<AsyncStoragePracticeRepository['saveSource']>
      ) {
        if (args[1].driveFileId === 'drive-new-failure') {
          throw new Error('Injected failure for the new source.');
        }
        return repository.saveSource(...args);
      },
    };
    const result = await executeDriveImportPlan({
      loadDriveSource: async (source) => source,
      now: () => CREATED_AT,
      ownerId: OWNER_ID,
      plan,
      repository: failingRepository,
    });

    assert.equal(result.summary.status, 'partial-failure');
    assert.deepEqual(
      result.outcomes
        .map(({ itemId, status }) => ({ itemId, status }))
        .sort((a, b) => a.itemId.localeCompare(b.itemId)),
      [
        {
          itemId: 'drive:drive-already-present',
          status: 'reused',
        },
        { itemId: 'drive:drive-new-failure', status: 'failed' },
        { itemId: 'drive:drive-reusable', status: 'reused' },
        { itemId: 'existing-already-present-link', status: 'already-present' },
        {
          itemId: `file-link:drive-import:drive-new-failure:${encodeURIComponent(REHEARSAL_LIBRARY_ROOT_FOLDER_ID)}`,
          status: 'failed',
        },
        {
          itemId: `file-link:drive-import:drive-reusable:${encodeURIComponent(REHEARSAL_LIBRARY_ROOT_FOLDER_ID)}`,
          status: 'created',
        },
      ].sort((a, b) => a.itemId.localeCompare(b.itemId)),
    );

    const retryPlan = createDriveImportRetryPlan({
      libraryState: await createPlanState(repository),
      outcomes: result.outcomes,
      plan,
    });

    assert.deepEqual(
      retryPlan.tracks.map(({ source }) => source.driveFileId),
      ['drive-new-failure'],
    );
  });
});
