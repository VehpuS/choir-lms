/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createDriveAudioSource } from '@org/audio-library-models';
import type { DriveCurrentSourceLocationResult } from '@org/google-drive';

import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';
import { resolveSavedSourceCurrentLocation } from './resolve-saved-source-current-location.js';

const ALTO_LOCATION = {
  parentFolderId: 'folder-alto',
  parentFolderName: 'Alto',
  rootKind: 'my-drive' as const,
  path: [
    { id: 'folder-concert', name: 'Spring concert' },
    { id: 'folder-alto', name: 'Alto' },
  ],
};

const createSource = (
  overrides: Partial<DriveLibrarySource> = {},
): DriveLibrarySource => {
  return {
    ...createDriveAudioSource({
      availability: { status: 'available' },
      driveFileId: 'drive-track',
      mimeType: 'audio/mpeg',
      name: 'Warmup.mp3',
    }),
    ...overrides,
  };
};

describe('resolveSavedSourceCurrentLocation', () => {
  it('does not persist when the resolved location matches stored provenance', async () => {
    const source = createSource({ sourceLocation: ALTO_LOCATION });
    let saveCount = 0;

    const result = await resolveSavedSourceCurrentLocation({
      accessToken: 'drive-token',
      resolveCurrentLocation: async () => {
        return {
          status: 'resolved',
          location: ALTO_LOCATION,
        } satisfies DriveCurrentSourceLocationResult;
      },
      saveSource: async () => {
        saveCount += 1;
        return true;
      },
      source,
    });

    assert.deepEqual(result, {
      status: 'resolved',
      hasMoved: false,
      location: ALTO_LOCATION,
    });
    assert.equal(saveCount, 0);
  });

  it('persists the refreshed location and preserves other fields when the file moved', async () => {
    const movedLocation = {
      parentFolderId: 'folder-soprano',
      parentFolderName: 'Soprano',
      rootKind: 'my-drive' as const,
      path: [
        { id: 'folder-concert', name: 'Spring concert' },
        { id: 'folder-soprano', name: 'Soprano' },
      ],
    };
    const source = createSource({
      sourceLocation: ALTO_LOCATION,
      tags: ['warmup'],
    });
    const savedSource: { current: DriveLibrarySource | null } = {
      current: null,
    };

    const result = await resolveSavedSourceCurrentLocation({
      accessToken: 'drive-token',
      resolveCurrentLocation: async () => {
        return {
          status: 'resolved',
          location: movedLocation,
        } satisfies DriveCurrentSourceLocationResult;
      },
      saveSource: async (savedSourceOption) => {
        savedSource.current = savedSourceOption;
        return true;
      },
      source,
    });

    assert.deepEqual(result, {
      status: 'resolved',
      hasMoved: true,
      location: movedLocation,
    });
    assert.deepEqual(savedSource.current?.sourceLocation, movedLocation);
    assert.deepEqual(savedSource.current?.tags, ['warmup']);
    assert.equal(savedSource.current?.id, source.id);
  });

  it('treats a legacy source with no stored provenance as moved and persists its first location', async () => {
    const source = createSource();
    const savedSource: { current: DriveLibrarySource | null } = {
      current: null,
    };

    const result = await resolveSavedSourceCurrentLocation({
      accessToken: 'drive-token',
      resolveCurrentLocation: async () => {
        return {
          status: 'resolved',
          location: ALTO_LOCATION,
        } satisfies DriveCurrentSourceLocationResult;
      },
      saveSource: async (savedSourceOption) => {
        savedSource.current = savedSourceOption;
        return true;
      },
      source,
    });

    assert.equal(result.status, 'resolved');
    assert.equal((result as { hasMoved: boolean }).hasMoved, true);
    assert.deepEqual(savedSource.current?.sourceLocation, ALTO_LOCATION);
  });

  it('reports an unresolved current location without persisting', async () => {
    const source = createSource({ sourceLocation: ALTO_LOCATION });
    let saveCount = 0;

    const result = await resolveSavedSourceCurrentLocation({
      accessToken: 'drive-token',
      resolveCurrentLocation: async () => {
        return {
          status: 'unresolved',
          reason: 'missing',
        } satisfies DriveCurrentSourceLocationResult;
      },
      saveSource: async () => {
        saveCount += 1;
        return true;
      },
      source,
    });

    assert.deepEqual(result, { status: 'unresolved', reason: 'missing' });
    assert.equal(saveCount, 0);
  });
});
