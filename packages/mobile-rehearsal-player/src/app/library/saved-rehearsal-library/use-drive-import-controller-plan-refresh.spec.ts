/// <reference types="node" />

import type { DriveFolderContents } from '@org/google-drive';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { act } from 'react-test-renderer';

import {
  createDeferred,
  createDriveImportExecutionResult,
  createFolderImport,
  renderController,
  requireController,
  requireControllerState,
} from './drive-import-controller-test-fixtures.js';
import type { DriveImportMode } from './drive-import-planner.js';
import {
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

describe('useDriveImportController plan refresh behavior', () => {
  it('keeps the latest review when a superseded plan settles afterward', async () => {
    const { contents, folder } = createFolderImport();
    const enumerations = [
      createDeferred<DriveFolderContents>(),
      createDeferred<DriveFolderContents>(),
    ];
    let enumerateCallCount = 0;
    const dependencies: DriveImportControllerDependencies = {
      enumerateFolderContents: () =>
        enumerations[enumerateCallCount++]?.promise ??
        Promise.reject(new Error('Unexpected enumeration call.')),
      executePlan: async () => createDriveImportExecutionResult([]),
      loadLibraryState: async () => createLibraryState(),
    };
    const { box, renderer } = await renderController(dependencies);
    const plan = (mode: DriveImportMode) =>
      requireController(box).plan({
        destinationFolderId: DESTINATION_FOLDER_ID,
        mode,
        selection: [folder],
      });

    let firstPlanning!: ReturnType<DriveImportController['plan']>;
    act(() => {
      firstPlanning = plan('preserve-structure');
    });
    assert.equal(requireControllerState(box).status, 'preparing');

    let secondPlanning!: ReturnType<DriveImportController['plan']>;
    act(() => {
      secondPlanning = plan('flatten');
    });

    await act(async () => {
      enumerations[1]?.resolve(contents);
      await secondPlanning;
    });
    assert.equal(requireControllerState(box).status, 'review');

    await act(async () => {
      enumerations[0]?.reject(new Error('Aborted'));
      await firstPlanning;
    });
    assert.equal(requireControllerState(box).status, 'review');

    act(() => renderer.unmount());
  });

  it('reuses already-enumerated folder contents across mode changes', async () => {
    const { contents, folder } = createFolderImport();
    let enumerateCallCount = 0;
    const dependencies: DriveImportControllerDependencies = {
      enumerateFolderContents: async () => {
        enumerateCallCount += 1;
        return contents;
      },
      executePlan: async () => createDriveImportExecutionResult([]),
      loadLibraryState: async () => createLibraryState(),
    };
    const { box, renderer } = await renderController(dependencies);
    const plan = (mode: DriveImportMode) =>
      requireController(box).plan({
        destinationFolderId: DESTINATION_FOLDER_ID,
        mode,
        selection: [folder],
      });

    await act(async () => {
      await plan('preserve-structure');
    });
    await act(async () => {
      await plan('flatten');
    });
    await act(async () => {
      await plan('preserve-structure');
    });

    assert.equal(requireControllerState(box).status, 'review');
    assert.equal(enumerateCallCount, 1);

    act(() => renderer.unmount());
  });
});
