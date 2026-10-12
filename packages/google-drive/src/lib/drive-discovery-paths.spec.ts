import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  browseDriveLocation,
  searchDriveAudioFiles,
  type DriveFileMetadata,
} from './google-drive.js';

const SUPPORTED_MIME_TYPES = ['audio/mpeg'];
const SUPPORTED_EXTENSIONS = ['mp3'];
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const ORIGINAL_FETCH = globalThis.fetch;

const getRequestedFileId = (input: string | URL | Request) => {
  const pathnameParts = new URL(String(input)).pathname.split('/');
  return decodeURIComponent(pathnameParts.at(-1) ?? '');
};

const isListRequest = (input: string | URL | Request) => {
  return new URL(String(input)).searchParams.has('q');
};

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

describe('Drive discovery paths', () => {
  it('attaches the containing path to audio in a browsed folder', async () => {
    globalThis.fetch = async (input) => {
      if (isListRequest(input)) {
        return Response.json({
          files: [
            {
              id: 'track-kyrie',
              name: 'Kyrie.mp3',
              mimeType: 'audio/mpeg',
              fileExtension: 'mp3',
              parents: ['folder-sectionals'],
            },
          ],
        });
      }

      return Response.json({
        id: 'folder-sectionals',
        name: 'Sectionals',
        mimeType: FOLDER_MIME_TYPE,
        parents: ['root'],
      } satisfies DriveFileMetadata);
    };

    const snapshot = await browseDriveLocation({
      accessToken: 'drive-token',
      location: {
        id: 'folder-sectionals',
        kind: 'folder',
        name: 'Sectionals',
        rootKind: 'my-drive',
      },
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.deepEqual(snapshot.playableSources[0]?.path, [
      { id: 'folder-sectionals', name: 'Sectionals' },
    ]);
    assert.equal(
      snapshot.playableSources[0]?.locationLabel,
      'My Drive / Sectionals',
    );
    assert.equal(snapshot.playableSources[0]?.rootKind, 'my-drive');
  });

  it('hands over the audio rows before their paths are resolved, then the full snapshot', async () => {
    const order: string[] = [];

    globalThis.fetch = async (input) => {
      if (isListRequest(input)) {
        return Response.json({
          files: [
            {
              id: 'track-kyrie',
              name: 'Kyrie.mp3',
              mimeType: 'audio/mpeg',
              fileExtension: 'mp3',
              parents: ['folder-sectionals'],
            },
          ],
        });
      }

      order.push('path-request');

      return Response.json({
        id: 'folder-sectionals',
        name: 'Sectionals',
        mimeType: FOLDER_MIME_TYPE,
        parents: ['root'],
      } satisfies DriveFileMetadata);
    };

    const early: {
      snapshot?: Awaited<ReturnType<typeof browseDriveLocation>>;
    } = {};
    const snapshot = await browseDriveLocation({
      accessToken: 'drive-token',
      location: {
        id: 'folder-sectionals',
        kind: 'folder',
        name: 'Sectionals',
        rootKind: 'my-drive',
      },
      onSources: (sourcesSnapshot) => {
        order.push('sources');
        early.snapshot = sourcesSnapshot;
      },
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.equal(order[0], 'sources');
    assert.equal(early.snapshot?.playableSources[0]?.name, 'Kyrie.mp3');
    assert.equal(early.snapshot?.playableSources[0]?.path, undefined);
    assert.deepEqual(snapshot.playableSources[0]?.path, [
      { id: 'folder-sectionals', name: 'Sectionals' },
    ]);
  });

  it('attaches a shared path to mixed search results with cached ancestry', async () => {
    let ancestorRequestCount = 0;

    globalThis.fetch = async (input) => {
      if (isListRequest(input)) {
        return Response.json({
          files: [
            {
              id: 'folder-kyrie',
              name: 'Kyrie folder',
              mimeType: FOLDER_MIME_TYPE,
              parents: ['folder-concert'],
              shared: true,
            },
            {
              id: 'track-kyrie',
              name: 'Kyrie.mp3',
              mimeType: 'audio/mpeg',
              fileExtension: 'mp3',
              parents: ['folder-concert'],
              shared: true,
            },
          ],
        });
      }

      assert.equal(getRequestedFileId(input), 'folder-concert');
      ancestorRequestCount += 1;

      return Response.json({
        id: 'folder-concert',
        name: 'Spring concert',
        mimeType: FOLDER_MIME_TYPE,
        parents: [],
        shared: true,
      } satisfies DriveFileMetadata);
    };

    const snapshot = await searchDriveAudioFiles({
      accessToken: 'drive-token',
      query: 'Kyrie',
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.equal(ancestorRequestCount, 1);
    assert.deepEqual(
      snapshot.results.map(({ kind, locationLabel, path, rootKind }) => ({
        kind,
        locationLabel,
        path,
        rootKind,
      })),
      [
        {
          kind: 'folder',
          locationLabel: 'Shared with you / Spring concert',
          path: [{ id: 'folder-concert', name: 'Spring concert' }],
          rootKind: 'shared',
        },
        {
          kind: 'audio',
          locationLabel: 'Shared with you / Spring concert',
          path: [{ id: 'folder-concert', name: 'Spring concert' }],
          rootKind: 'shared',
        },
      ],
    );
  });
});
