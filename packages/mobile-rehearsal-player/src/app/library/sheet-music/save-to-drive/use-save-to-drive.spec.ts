/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveUploadResult } from '@org/google-drive';
import { createElement } from 'react';
import { act, create } from 'react-test-renderer';

import type { DeviceFile } from './device-file-chooser-types.js';
import type { DeviceFileCheck } from './device-file-model.js';
import type { SaveLinkOutcome } from './save-flow-model.js';
import {
  useSaveToDrive,
  type SaveToDriveDependencies,
} from './use-save-to-drive.js';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const ACCEPTED: DeviceFileCheck = {
  bytes: new Uint8Array([1, 2]),
  format: 'pdf',
  mimeType: 'application/pdf',
  name: 'Kyrie.pdf',
  status: 'accepted',
};
const FILE: DeviceFile = {
  mimeType: 'application/pdf',
  name: 'Kyrie.pdf',
  read: async () => new Uint8Array([1, 2]),
  size: 2,
};
const TARGET = { folderId: 'folder-1', folderName: 'Scores' };
const UPLOADED: DriveUploadResult = {
  file: { id: 'new-1', name: 'Kyrie.pdf' },
  status: 'uploaded',
};

// A controlled upload: the spec answers (or leaves pending) as it needs.
const setUp = (
  options: { accessToken?: string | undefined; outcome?: SaveLinkOutcome } = {},
) => {
  const uploads: Array<{
    folderId: string;
    resolve: (result: DriveUploadResult) => void;
    signal?: AbortSignal;
  }> = [];
  const saved: Array<{ fileId: string; name: string }> = [];
  const dependencies: SaveToDriveDependencies = {
    checkFile: async () => ACCEPTED,
    chooseFile: async () => ({ file: FILE, status: 'chosen' }),
    upload: (request) =>
      new Promise((resolve) => {
        uploads.push({
          folderId: request.folderId,
          resolve,
          signal: request.signal,
        });
      }),
  };
  const box: { current: ReturnType<typeof useSaveToDrive> | null } = {
    current: null,
  };
  const Harness = () => {
    box.current = useSaveToDrive({
      accessToken: 'accessToken' in options ? options.accessToken : 'token',
      dependencies,
      mode: 'link',
      onSaved: async (file) => {
        saved.push(file);

        return options.outcome ?? 'linked';
      },
    });

    return null;
  };

  return { box, Harness, saved, uploads };
};

const mount = async (setup: ReturnType<typeof setUp>) => {
  let renderer: ReturnType<typeof create> | undefined;

  await act(async () => {
    renderer = create(createElement(setup.Harness));
  });

  return renderer;
};

const reachUpload = async (setup: ReturnType<typeof setUp>) => {
  await act(async () => setup.box.current?.chooseFile());
  await act(async () => setup.box.current?.chooseFolder(TARGET));
};

describe('useSaveToDrive', () => {
  it('moves from a chosen file to the folder step', async () => {
    const setup = setUp();

    await mount(setup);
    await act(async () => setup.box.current?.chooseFile());

    assert.equal(setup.box.current?.state.step, 'folder');
    assert.equal(setup.box.current?.state.file?.name, 'Kyrie.pdf');
  });

  it('uploads into the chosen folder, then hands the saved file to the caller', async () => {
    const setup = setUp();

    await mount(setup);
    await reachUpload(setup);

    assert.equal(setup.box.current?.state.step, 'uploading');
    assert.equal(setup.uploads[0]?.folderId, 'folder-1');

    await act(async () => setup.uploads[0]?.resolve(UPLOADED));

    assert.deepEqual(setup.saved, [{ fileId: 'new-1', name: 'Kyrie.pdf' }]);
    assert.equal(setup.box.current?.state.step, 'saved');
  });

  it('aborts the upload on cancel and returns to the folder step with the file kept', async () => {
    const setup = setUp();

    await mount(setup);
    await reachUpload(setup);
    await act(async () => {
      setup.box.current?.cancelUpload();
      setup.uploads[0]?.resolve({ status: 'aborted' });
    });

    assert.equal(setup.uploads[0]?.signal?.aborted, true);
    assert.equal(setup.box.current?.state.step, 'folder');
    assert.equal(setup.saved.length, 0);
  });

  it('retries a failed upload into the same folder', async () => {
    const setup = setUp();

    await mount(setup);
    await reachUpload(setup);
    await act(async () =>
      setup.uploads[0]?.resolve({ reason: 'offline', status: 'failed' }),
    );

    assert.equal(setup.box.current?.state.failure, 'offline');

    await act(async () => setup.box.current?.retry());

    assert.equal(setup.uploads.length, 2);
    assert.equal(setup.uploads[1]?.folderId, 'folder-1');
  });

  it('reports a source removed while the file saved', async () => {
    const setup = setUp({ outcome: 'source-removed' });

    await mount(setup);
    await reachUpload(setup);
    await act(async () => setup.uploads[0]?.resolve(UPLOADED));

    assert.equal(setup.box.current?.state.sourceRemoved, true);
  });

  it('asks for the write permission without a request when there is no token', async () => {
    const setup = setUp({ accessToken: undefined });

    await mount(setup);
    await reachUpload(setup);

    assert.equal(setup.uploads.length, 0);
    assert.equal(setup.box.current?.state.failure, 'needs-write-access');
  });

  it('aborts an upload in flight when the sheet closes, and ignores its late answer', async () => {
    const setup = setUp();
    const renderer = await mount(setup);

    await reachUpload(setup);
    await act(async () => renderer?.unmount());
    await act(async () => setup.uploads[0]?.resolve(UPLOADED));

    assert.equal(setup.uploads[0]?.signal?.aborted, true);
    assert.equal(setup.saved.length, 0);
  });
});
