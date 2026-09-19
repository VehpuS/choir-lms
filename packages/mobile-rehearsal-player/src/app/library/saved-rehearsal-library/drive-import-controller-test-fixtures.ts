import type {
  DriveEnumeratedAudioSource,
  DriveFolderContents,
} from '@org/google-drive';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import type { DriveImportExecutionResult } from './drive-import-executor';
import {
  createAudio,
  createFolder,
} from './drive-import-planner-test-fixtures';
import {
  type DriveImportController,
  type DriveImportControllerDependencies,
  useDriveImportController,
} from './use-drive-import-controller';

export const renderController = async (
  dependencies: DriveImportControllerDependencies,
  onLibraryChanged: () => Promise<unknown> = async () => undefined,
) => {
  const box: { current: DriveImportController | null } = { current: null };

  const Harness = () => {
    box.current = useDriveImportController({
      dependencies,
      onLibraryChanged,
    });
    return null;
  };
  let renderer!: ReactTestRenderer;

  await act(async () => {
    renderer = create(createElement(Harness));
  });

  return { box, renderer };
};

export const requireController = (box: {
  current: DriveImportController | null;
}) => {
  assert.ok(box.current);
  return box.current;
};

export const requireControllerState = (box: {
  current: DriveImportController | null;
}) => requireController(box).state;

export const createFolderImport = () => {
  const folder = createFolder('drive-folder', 'Warmups');
  const source = createAudio(
    'drive-track',
    'Warmup.mp3',
    folder.id,
  ) as DriveEnumeratedAudioSource;
  const contents: DriveFolderContents = {
    folders: [],
    playableSources: [source],
    unavailableSources: [],
  };

  return { contents, folder };
};

export const createDriveImportExecutionResult = (
  outcomes: DriveImportExecutionResult['outcomes'],
): DriveImportExecutionResult => {
  const counts: DriveImportExecutionResult['summary']['counts'] = {
    'already-present': 0,
    cancelled: 0,
    created: 0,
    failed: 0,
    'overlap-collapsed': 0,
    reused: 0,
    unsupported: 0,
  };

  for (const outcome of outcomes) {
    counts[outcome.status] += 1;
  }

  return {
    outcomes,
    summary: {
      counts,
      status:
        counts.cancelled > 0
          ? 'cancelled'
          : counts.failed > 0
            ? 'partial-failure'
            : 'completed',
      totalItems: outcomes.length,
    },
  };
};

export const createDeferred = <Value>() => {
  let resolve!: (value: Value) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
};
