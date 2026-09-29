/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { openDriveFileInGoogleDrive } from './open-drive-file-in-google-drive.js';

const FILE_URL = 'https://drive.google.com/file/d/alto-line/view';

describe('openDriveFileInGoogleDrive', () => {
  it('opens the file page when the device can open the link', async () => {
    const openedUrls: string[] = [];
    const result = await openDriveFileInGoogleDrive({
      canOpenUrl: async () => true,
      openUrl: async (url) => {
        openedUrls.push(url);
      },
      url: FILE_URL,
    });

    assert.deepEqual(result, { status: 'opened' });
    assert.deepEqual(openedUrls, [FILE_URL]);
  });

  it('reports a missing link without trying to open anything', async () => {
    let didOpen = false;
    const result = await openDriveFileInGoogleDrive({
      canOpenUrl: async () => true,
      openUrl: async () => {
        didOpen = true;
      },
      url: undefined,
    });

    assert.deepEqual(result, { status: 'no-link' });
    assert.equal(didOpen, false);
  });

  it('reports links the device cannot open', async () => {
    const result = await openDriveFileInGoogleDrive({
      canOpenUrl: async () => false,
      openUrl: async () => undefined,
      url: FILE_URL,
    });

    assert.deepEqual(result, { status: 'unsupported-link' });
  });

  it('reports a failed open', async () => {
    const result = await openDriveFileInGoogleDrive({
      canOpenUrl: async () => true,
      openUrl: async () => {
        throw new Error('no handler');
      },
      url: FILE_URL,
    });

    assert.deepEqual(result, { status: 'open-failed' });
  });
});
