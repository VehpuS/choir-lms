/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createDriveAudioSource } from '@org/audio-library-models';
import type { DriveCurrentSourceLocationResult } from '@org/google-drive';

import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';
import {
  buildDriveFolderUrl,
  openSavedSourceOriginalFolderInGoogleDrive,
} from './open-saved-source-original-location.js';

const LOCATION = {
  parentFolderId: 'folder-alto',
  parentFolderName: 'Alto',
  rootKind: 'my-drive' as const,
  path: [{ id: 'folder-alto', name: 'Alto' }],
};

const createSource = (): DriveLibrarySource => {
  return createDriveAudioSource({
    availability: { status: 'available' },
    driveFileId: 'drive-track',
    mimeType: 'audio/mpeg',
    name: 'Warmup.mp3',
    sourceLocation: LOCATION,
  });
};

describe('buildDriveFolderUrl', () => {
  it('builds a Drive folder URL from the current parent folder id', () => {
    assert.equal(
      buildDriveFolderUrl('folder-alto'),
      'https://drive.google.com/drive/folders/folder-alto',
    );
  });
});

describe('openSavedSourceOriginalFolderInGoogleDrive', () => {
  it('opens the resolved current parent folder URL, not the stored one', async () => {
    const movedLocation = {
      parentFolderId: 'folder-soprano',
      parentFolderName: 'Soprano',
      rootKind: 'my-drive' as const,
      path: [{ id: 'folder-soprano', name: 'Soprano' }],
    };
    const openedUrls: string[] = [];

    const result = await openSavedSourceOriginalFolderInGoogleDrive({
      accessToken: 'drive-token',
      canOpenUrl: async () => true,
      openUrl: async (url) => {
        openedUrls.push(url);
      },
      resolveCurrentLocation: async () => {
        return {
          status: 'resolved',
          location: movedLocation,
        } satisfies DriveCurrentSourceLocationResult;
      },
      saveSource: async () => true,
      source: createSource(),
    });

    assert.deepEqual(result, { status: 'opened' });
    assert.deepEqual(openedUrls, [
      'https://drive.google.com/drive/folders/folder-soprano',
    ]);
  });

  it('reports an unresolved current location without opening anything', async () => {
    let openCount = 0;

    const result = await openSavedSourceOriginalFolderInGoogleDrive({
      accessToken: 'drive-token',
      canOpenUrl: async () => true,
      openUrl: async () => {
        openCount += 1;
      },
      resolveCurrentLocation: async () => {
        return {
          status: 'unresolved',
          reason: 'missing',
        } satisfies DriveCurrentSourceLocationResult;
      },
      saveSource: async () => true,
      source: createSource(),
    });

    assert.deepEqual(result, { status: 'unresolved', reason: 'missing' });
    assert.equal(openCount, 0);
  });

  it('reports an unsupported link instead of opening it', async () => {
    let openCount = 0;

    const result = await openSavedSourceOriginalFolderInGoogleDrive({
      accessToken: 'drive-token',
      canOpenUrl: async () => false,
      openUrl: async () => {
        openCount += 1;
      },
      resolveCurrentLocation: async () => {
        return {
          status: 'resolved',
          location: LOCATION,
        } satisfies DriveCurrentSourceLocationResult;
      },
      saveSource: async () => true,
      source: createSource(),
    });

    assert.deepEqual(result, { status: 'unsupported-link' });
    assert.equal(openCount, 0);
  });

  it('reports an open failure instead of throwing', async () => {
    const result = await openSavedSourceOriginalFolderInGoogleDrive({
      accessToken: 'drive-token',
      canOpenUrl: async () => true,
      openUrl: async () => {
        throw new Error('The device declined to open this link.');
      },
      resolveCurrentLocation: async () => {
        return {
          status: 'resolved',
          location: LOCATION,
        } satisfies DriveCurrentSourceLocationResult;
      },
      saveSource: async () => true,
      source: createSource(),
    });

    assert.deepEqual(result, { status: 'open-failed' });
  });
});
