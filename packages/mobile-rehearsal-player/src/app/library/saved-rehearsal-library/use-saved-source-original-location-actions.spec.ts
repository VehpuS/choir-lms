/// <reference types="node" />

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { createDriveAudioSource } from '@org/audio-library-models';
import type { DriveFolder } from '@org/google-drive';

import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';
import { useSavedSourceOriginalLocationActions } from './use-saved-source-original-location-actions.js';

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Actions = ReturnType<typeof useSavedSourceOriginalLocationActions>;

const SOURCE: DriveLibrarySource = createDriveAudioSource({
  availability: { status: 'available' },
  driveFileId: 'drive-track',
  mimeType: 'audio/mpeg',
  name: 'Warmup.mp3',
  sourceLocation: {
    parentFolderId: 'folder-alto',
    parentFolderName: 'Alto',
    rootKind: 'my-drive',
    path: [{ id: 'folder-alto', name: 'Alto' }],
  },
});

const renderActions = async (
  options: Parameters<typeof useSavedSourceOriginalLocationActions>[0],
) => {
  const box: { current: Actions | null } = { current: null };
  const Harness = () => {
    box.current = useSavedSourceOriginalLocationActions(options);
    return null;
  };
  let renderer!: ReactTestRenderer;

  await act(async () => {
    renderer = create(createElement(Harness));
  });

  return { box, renderer };
};

describe('useSavedSourceOriginalLocationActions', () => {
  it('switches to Add immediately even without an access token, then reports why it could not resolve', async () => {
    let didGoToAdd = false;
    const { box } = await renderActions({
      accessToken: undefined,
      canOpenUrl: async () => true,
      onOpenDriveFolder: () => undefined,
      onRequestAddDestination: () => {
        didGoToAdd = true;
      },
      onSaveSource: async () => true,
      openUrl: async () => undefined,
    });

    await act(async () => {
      box.current?.showSourceInAdd(SOURCE);
    });

    assert.equal(didGoToAdd, true);
    assert.equal(box.current?.pendingSourceLocationAction, null);
    assert.equal(box.current?.sourceLocationIssue?.sourceId, SOURCE.id);
    assert.match(box.current?.sourceLocationIssue?.message ?? '', /Reconnect/);
  });

  it('does not switch destinations for a failed authorization check on Open in Google Drive', async () => {
    const { box } = await renderActions({
      accessToken: undefined,
      canOpenUrl: async () => true,
      onOpenDriveFolder: () => undefined,
      onRequestAddDestination: () => undefined,
      onSaveSource: async () => true,
      openUrl: async () => undefined,
    });

    await act(async () => {
      box.current?.openSourceInGoogleDrive(SOURCE);
    });

    assert.equal(box.current?.sourceLocationIssue?.sourceId, SOURCE.id);
  });

  it('opens the resolved folder in Add and clears the pending state', async () => {
    const metadataById = new Map([
      [
        'drive-track',
        {
          id: 'drive-track',
          name: 'Warmup.mp3',
          mimeType: 'audio/mpeg',
          parents: ['folder-alto'],
        },
      ],
      [
        'folder-alto',
        {
          id: 'folder-alto',
          name: 'Alto',
          mimeType: 'application/vnd.google-apps.folder',
          parents: ['root'],
        },
      ],
    ]);

    globalThis.fetch = async (input) => {
      const pathnameParts = new URL(String(input)).pathname.split('/');
      const requestedId = decodeURIComponent(pathnameParts.at(-1) ?? '');
      const metadata = metadataById.get(requestedId);

      assert.ok(metadata);
      return Response.json(metadata);
    };

    const openedFolders: DriveFolder[] = [];
    let didGoToAdd = false;
    const { box } = await renderActions({
      accessToken: 'drive-token',
      canOpenUrl: async () => true,
      onOpenDriveFolder: (folder) => {
        openedFolders.push(folder);
      },
      onRequestAddDestination: () => {
        didGoToAdd = true;
      },
      onSaveSource: async () => true,
      openUrl: async () => undefined,
    });

    await act(async () => {
      box.current?.showSourceInAdd(SOURCE);
      for (let flush = 0; flush < 10; flush += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    });

    assert.equal(box.current?.pendingSourceLocationAction, null);
    assert.equal(box.current?.sourceLocationIssue, null);
    assert.equal(didGoToAdd, true);
    assert.deepEqual(openedFolders, [
      {
        id: 'folder-alto',
        name: 'Alto',
        path: SOURCE.sourceLocation?.path,
        rootKind: 'my-drive',
        shared: false,
      },
    ]);
  });

  it('switches to Add before the Drive lookup resolves, not after', async () => {
    const callOrder: string[] = [];
    // Resolving this file's path needs two sequential Drive requests (its
    // own metadata, then its parent folder's). Only the first is gated so
    // the test can observe "goToAdd fired, nothing else has happened yet"
    // before letting the rest of the chain (and its second request)
    // complete normally.
    let releaseFirstRequest: (() => void) | undefined;
    const firstRequestGate = new Promise<void>((resolve) => {
      releaseFirstRequest = resolve;
    });
    let isFirstRequest = true;

    globalThis.fetch = async () => {
      if (isFirstRequest) {
        isFirstRequest = false;
        await firstRequestGate;
        return Response.json({
          id: 'drive-track',
          name: 'Warmup.mp3',
          mimeType: 'audio/mpeg',
          parents: ['folder-alto'],
        });
      }

      return Response.json({
        id: 'folder-alto',
        name: 'Alto',
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['root'],
      });
    };

    const { box } = await renderActions({
      accessToken: 'drive-token',
      canOpenUrl: async () => true,
      onOpenDriveFolder: () => {
        callOrder.push('openFolder');
      },
      onRequestAddDestination: () => {
        callOrder.push('goToAdd');
      },
      onSaveSource: async () => true,
      openUrl: async () => undefined,
    });

    act(() => {
      box.current?.showSourceInAdd(SOURCE);
    });

    assert.deepEqual(callOrder, ['goToAdd']);

    await act(async () => {
      releaseFirstRequest?.();
      for (let flush = 0; flush < 10; flush += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    });

    assert.deepEqual(callOrder, ['goToAdd', 'openFolder']);
  });

  it('reports which action is pending, keyed to the source, while the Drive lookup is in flight', async () => {
    const deferred: { resolve: (response: Response) => void } = {
      resolve: () => undefined,
    };

    globalThis.fetch = () => {
      return new Promise((resolve) => {
        deferred.resolve = resolve;
      });
    };

    const { box } = await renderActions({
      accessToken: 'drive-token',
      canOpenUrl: async () => true,
      onOpenDriveFolder: () => undefined,
      onRequestAddDestination: () => undefined,
      onSaveSource: async () => true,
      openUrl: async () => undefined,
    });

    act(() => {
      box.current?.openSourceInGoogleDrive(SOURCE);
    });
    await act(async () => {
      await Promise.resolve();
    });

    assert.deepEqual(box.current?.pendingSourceLocationAction, {
      kind: 'open-in-google-drive',
      sourceId: SOURCE.id,
    });

    await act(async () => {
      deferred.resolve(
        Response.json({
          id: 'drive-track',
          name: 'Warmup.mp3',
          mimeType: 'audio/mpeg',
          parents: [],
        }),
      );
      for (let flush = 0; flush < 10; flush += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    });

    assert.equal(box.current?.pendingSourceLocationAction, null);
  });
});
