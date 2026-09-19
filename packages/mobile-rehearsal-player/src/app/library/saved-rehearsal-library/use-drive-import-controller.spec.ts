/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveAudioDiscoveryResult } from '@org/google-drive';
import { act } from 'react-test-renderer';

import type { DriveFolderContents } from '@org/google-drive';

import {
  createDeferred,
  createDriveImportExecutionResult,
  createFolderImport,
  renderController,
  requireController,
  requireControllerState,
} from './drive-import-controller-test-fixtures.js';
import type { DriveImportExecutionResult } from './drive-import-executor.js';
import {
  createAudio,
  createLibraryState,
  DESTINATION_FOLDER_ID,
} from './drive-import-planner-test-fixtures.js';
import {
  type DriveImportController,
  type DriveImportControllerDependencies,
} from './use-drive-import-controller.js';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('useDriveImportController', () => {
  it('moves from preparation through review and execution completion', async () => {
    const { contents, folder } = createFolderImport();
    const enumeration = createDeferred<DriveFolderContents>();
    const execution = createDeferred<DriveImportExecutionResult>();
    const progressPhases: string[] = [];
    let refreshCount = 0;
    const dependencies: DriveImportControllerDependencies = {
      enumerateFolderContents: () => enumeration.promise,
      async executePlan({ onProgress }) {
        onProgress({
          completedItems: 1,
          phase: 'saving-sources',
          totalItems: 1,
        });
        progressPhases.push('saving-sources');
        return execution.promise;
      },
      loadLibraryState: async () => createLibraryState(),
    };
    const { box, renderer } = await renderController(dependencies, async () => {
      refreshCount += 1;
    });
    let planning!: ReturnType<DriveImportController['plan']>;

    act(() => {
      planning = requireController(box).plan({
        destinationFolderId: DESTINATION_FOLDER_ID,
        mode: 'preserve-structure',
        selection: [folder],
      });
    });
    assert.equal(requireControllerState(box).status, 'preparing');

    await act(async () => {
      enumeration.resolve(contents);
      await planning;
    });
    assert.equal(requireControllerState(box).status, 'review');

    let executing!: Promise<DriveImportExecutionResult | null>;
    act(() => {
      const executionRequest = requireController(box).execute();
      assert.ok(executionRequest);
      executing = executionRequest;
    });
    assert.equal(requireControllerState(box).status, 'executing');
    assert.deepEqual(progressPhases, ['saving-sources']);

    await act(async () => {
      execution.resolve(
        createDriveImportExecutionResult([
          {
            itemId: 'drive-track',
            itemKind: 'source',
            itemName: 'Warmup.mp3',
            status: 'created',
          },
        ]),
      );
      await executing;
    });
    assert.equal(requireControllerState(box).status, 'completed');
    assert.equal(refreshCount, 1);

    act(() => renderer.unmount());
  });

  it('cancels active execution and retries cancelled work from fresh state', async () => {
    const source = createAudio(
      'drive-track',
      'Warmup.mp3',
    ) as DriveAudioDiscoveryResult;
    let executeCount = 0;
    let libraryStateLoads = 0;
    const dependencies: DriveImportControllerDependencies = {
      async enumerateFolderContents() {
        throw new Error('No folder enumeration expected.');
      },
      async executePlan({ plan, signal }) {
        executeCount += 1;
        const track = plan.tracks[0];
        assert.ok(track);

        if (executeCount === 1) {
          return new Promise((resolve) => {
            signal.addEventListener('abort', () => {
              resolve(
                createDriveImportExecutionResult([
                  {
                    itemId: track.canonicalSourceId,
                    itemKind: 'source',
                    itemName: track.source.name,
                    status: 'cancelled',
                  },
                ]),
              );
            });
          });
        }

        return createDriveImportExecutionResult([
          {
            itemId: track.canonicalSourceId,
            itemKind: 'source',
            itemName: track.source.name,
            status: 'created',
          },
        ]);
      },
      async loadLibraryState() {
        libraryStateLoads += 1;
        return createLibraryState();
      },
    };
    const { box, renderer } = await renderController(dependencies);

    await act(async () => {
      await box.current?.plan({
        destinationFolderId: DESTINATION_FOLDER_ID,
        mode: 'flatten',
        selection: [source],
      });
    });
    let firstExecution!: Promise<DriveImportExecutionResult | null>;
    act(() => {
      const executionRequest = requireController(box).execute();
      assert.ok(executionRequest);
      firstExecution = executionRequest;
    });
    act(() => box.current?.cancel());
    await act(async () => {
      await firstExecution;
    });

    const cancelledState = requireControllerState(box);
    assert.equal(cancelledState.status, 'completed');
    if (cancelledState.status === 'completed') {
      assert.equal(cancelledState.result.summary.status, 'cancelled');
    }

    await act(async () => {
      await box.current?.retry();
    });
    const retriedState = requireControllerState(box);
    assert.equal(retriedState.status, 'completed');
    if (retriedState.status === 'completed') {
      assert.equal(retriedState.result.summary.status, 'completed');
    }
    assert.equal(executeCount, 2);
    assert.equal(libraryStateLoads, 2);

    act(() => renderer.unmount());
  });

  it('recovers from a preparation error when planning is attempted again', async () => {
    const source = createAudio(
      'drive-track',
      'Warmup.mp3',
    ) as DriveAudioDiscoveryResult;
    let shouldFail = true;
    const dependencies: DriveImportControllerDependencies = {
      async enumerateFolderContents() {
        throw new Error('No folder enumeration expected.');
      },
      executePlan: async () => createDriveImportExecutionResult([]),
      async loadLibraryState() {
        if (shouldFail) {
          shouldFail = false;
          throw new Error('Injected planning failure.');
        }
        return createLibraryState();
      },
    };
    const { box, renderer } = await renderController(dependencies);
    const plan = () =>
      requireController(box).plan({
        destinationFolderId: DESTINATION_FOLDER_ID,
        mode: 'flatten',
        selection: [source],
      });

    await act(async () => {
      await plan();
    });
    const failedState = requireControllerState(box);
    assert.equal(failedState.status, 'error');
    if (failedState.status === 'error') {
      assert.equal(failedState.operation, 'plan');
      assert.equal(failedState.message, 'Injected planning failure.');
    }

    await act(async () => {
      await plan();
    });
    assert.equal(requireControllerState(box).status, 'review');

    act(() => renderer.unmount());
  });
});
