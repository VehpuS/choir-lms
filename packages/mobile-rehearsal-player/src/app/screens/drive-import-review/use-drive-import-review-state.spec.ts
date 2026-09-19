/// <reference types="node" />

import type { DriveDiscoveryResult } from '@org/google-drive';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import type { DriveImportController } from '../../library/saved-rehearsal-library/use-drive-import-controller';
import type { DriveImportDestinationFolderOption } from './drive-import-review-model.js';
import { useDriveImportReviewState } from './use-drive-import-review-state.js';

const FOLDER_RESULT: DriveDiscoveryResult = {
  id: 'drive-folder-sopranos',
  kind: 'folder',
  name: 'Sopranos',
  rootKind: 'my-drive',
  shared: false,
};

const AUDIO_RESULT: DriveDiscoveryResult = {
  availability: { status: 'available' },
  createdAt: '2026-09-16T00:00:00.000Z',
  driveFileId: 'drive-audio-kyrie',
  id: 'drive-audio-kyrie',
  kind: 'audio',
  mimeType: 'audio/mpeg',
  name: 'Kyrie Alto.mp3',
  provider: 'google-drive',
  rootKind: 'my-drive',
};

const DESTINATION_FOLDERS: DriveImportDestinationFolderOption[] = [
  {
    folder: {
      createdAt: '2026-01-01T00:00:00.000Z',
      id: 'library-root',
      name: 'Library',
      parentFolderId: null,
    },
    label: 'Library',
  },
  {
    folder: {
      createdAt: '2026-01-01T00:00:00.000Z',
      id: 'library-sopranos',
      name: 'Sopranos',
      parentFolderId: 'library-root',
    },
    label: 'Library / Sopranos',
  },
];

const createFakeDriveImportController = (
  planCalls: Array<Parameters<DriveImportController['plan']>[0]>,
): DriveImportController => ({
  cancel: () => undefined,
  execute: () => null,
  plan: async (planOptions) => {
    planCalls.push(planOptions);
    return null;
  },
  reset: () => undefined,
  retry: async () => null,
  state: { status: 'idle' },
});

type HarnessProps = {
  destinationFolders: readonly DriveImportDestinationFolderOption[];
  driveImport: DriveImportController;
  rootFolderId: string | null;
  selectedResults: readonly DriveDiscoveryResult[];
};

type ReviewStateHook = ReturnType<typeof useDriveImportReviewState>;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('useDriveImportReviewState', () => {
  it('plans against the root destination for a folder-free selection without a mode toggle', async () => {
    const planCalls: Array<Parameters<DriveImportController['plan']>[0]> = [];
    const driveImport = createFakeDriveImportController(planCalls);
    const hookResult: { current: ReviewStateHook | null } = { current: null };
    const Harness = (props: HarnessProps) => {
      hookResult.current = useDriveImportReviewState(props);
      return null;
    };

    await act(async () => {
      create(
        createElement(Harness, {
          destinationFolders: DESTINATION_FOLDERS,
          driveImport,
          rootFolderId: 'library-root',
          selectedResults: [AUDIO_RESULT],
        }),
      );
    });

    assert.equal(hookResult.current?.hasFolderSelection, false);
    assert.equal(hookResult.current?.mode, 'flatten');
    assert.equal(hookResult.current?.destinationFolderId, 'library-root');
    assert.deepEqual(planCalls, [
      {
        destinationFolderId: 'library-root',
        mode: 'flatten',
        selection: [AUDIO_RESULT],
      },
    ]);
  });

  it('defaults to preserve structure once a folder is selected and replans on destination change', async () => {
    const planCalls: Array<Parameters<DriveImportController['plan']>[0]> = [];
    const driveImport = createFakeDriveImportController(planCalls);
    const hookResult: { current: ReviewStateHook | null } = { current: null };
    const Harness = (props: HarnessProps) => {
      hookResult.current = useDriveImportReviewState(props);
      return null;
    };
    let renderer!: ReactTestRenderer;

    await act(async () => {
      renderer = create(
        createElement(Harness, {
          destinationFolders: DESTINATION_FOLDERS,
          driveImport,
          rootFolderId: 'library-root',
          selectedResults: [FOLDER_RESULT],
        }),
      );
    });

    assert.equal(hookResult.current?.hasFolderSelection, true);
    assert.equal(hookResult.current?.mode, 'preserve-structure');

    act(() => hookResult.current?.selectDestinationFolder('library-sopranos'));
    await act(async () => {
      renderer.update(
        createElement(Harness, {
          destinationFolders: DESTINATION_FOLDERS,
          driveImport,
          rootFolderId: 'library-root',
          selectedResults: [FOLDER_RESULT],
        }),
      );
    });

    act(() => hookResult.current?.selectMode('flatten'));
    await act(async () => {
      renderer.update(
        createElement(Harness, {
          destinationFolders: DESTINATION_FOLDERS,
          driveImport,
          rootFolderId: 'library-root',
          selectedResults: [FOLDER_RESULT],
        }),
      );
    });

    assert.deepEqual(planCalls, [
      {
        destinationFolderId: 'library-root',
        mode: 'preserve-structure',
        selection: [FOLDER_RESULT],
      },
      {
        destinationFolderId: 'library-sopranos',
        mode: 'preserve-structure',
        selection: [FOLDER_RESULT],
      },
      {
        destinationFolderId: 'library-sopranos',
        mode: 'flatten',
        selection: [FOLDER_RESULT],
      },
    ]);

    act(() => renderer.unmount());
  });

  it('sorts destination folders by their readable path label', async () => {
    const driveImport = createFakeDriveImportController([]);
    const hookResult: { current: ReviewStateHook | null } = { current: null };
    const Harness = (props: HarnessProps) => {
      hookResult.current = useDriveImportReviewState(props);
      return null;
    };

    await act(async () => {
      create(
        createElement(Harness, {
          destinationFolders: [...DESTINATION_FOLDERS].reverse(),
          driveImport,
          rootFolderId: null,
          selectedResults: [AUDIO_RESULT],
        }),
      );
    });

    assert.deepEqual(
      hookResult.current?.destinationFolders.map(({ label }) => label),
      ['Library', 'Library / Sopranos'],
    );
    assert.equal(hookResult.current?.destinationFolderId, null);
  });
});
