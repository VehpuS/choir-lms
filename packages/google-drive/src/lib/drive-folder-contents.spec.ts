import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  enumerateDriveFolderContents,
  type DriveFolder,
} from './google-drive.js';

const SUPPORTED_MIME_TYPES = ['audio/mpeg'];
const SUPPORTED_EXTENSIONS = ['mp3'];
const ORIGINAL_FETCH = globalThis.fetch;

const createRootFolder = (
  rootKind: DriveFolder['rootKind'] = 'my-drive',
): DriveFolder => {
  return {
    id: 'folder-root',
    name: 'Root folder',
    rootKind,
    shared: rootKind === 'shared',
  };
};

const getQuery = (input: string | URL | Request) => {
  return new URL(String(input)).searchParams.get('q') ?? '';
};

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

describe('enumerateDriveFolderContents', () => {
  it('enumerates every page of a deep tree and requests cyclic folders once', async () => {
    const requestUrls: string[] = [];

    globalThis.fetch = async (input) => {
      const requestUrl = String(input);
      const query = getQuery(input);
      const pageToken = new URL(requestUrl).searchParams.get('pageToken');
      requestUrls.push(requestUrl);

      if (query.includes("'folder-root' in parents")) {
        if (pageToken === 'root-page-2') {
          return Response.json({
            files: [
              {
                id: 'folder-child',
                name: 'Child folder',
                mimeType: 'application/vnd.google-apps.folder',
              },
            ],
          });
        }

        return Response.json({ files: [], nextPageToken: 'root-page-2' });
      }

      if (query.includes("'folder-child' in parents")) {
        return Response.json({
          files: [
            {
              id: 'folder-grandchild',
              name: 'Grandchild folder',
              mimeType: 'application/vnd.google-apps.folder',
            },
            {
              id: 'folder-root',
              name: 'Root folder',
              mimeType: 'application/vnd.google-apps.folder',
            },
          ],
        });
      }

      return Response.json({
        files: [
          {
            id: 'deep-track',
            name: 'Deep track.mp3',
            mimeType: 'audio/mpeg',
            fileExtension: 'mp3',
          },
        ],
      });
    };

    const contents = await enumerateDriveFolderContents({
      accessToken: 'drive-token',
      rootFolder: createRootFolder(),
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.deepEqual(contents.folders, [
      {
        id: 'folder-child',
        name: 'Child folder',
        modifiedTime: undefined,
        rootKind: 'my-drive',
        shared: false,
        parentFolderId: 'folder-root',
      },
      {
        id: 'folder-grandchild',
        name: 'Grandchild folder',
        modifiedTime: undefined,
        rootKind: 'my-drive',
        shared: false,
        parentFolderId: 'folder-child',
      },
    ]);
    assert.deepEqual(
      contents.playableSources.map(({ id, parentFolderId }) => ({
        id,
        parentFolderId,
      })),
      [{ id: 'drive:deep-track', parentFolderId: 'folder-grandchild' }],
    );
    assert.equal(requestUrls.length, 4);
    assert.equal(
      requestUrls.filter((requestUrl) => {
        return getQuery(requestUrl).includes("'folder-root' in parents");
      }).length,
      2,
    );
  });

  it('preserves shared-root folder identity and shared-drive request options', async () => {
    let requestUrl = '';

    globalThis.fetch = async (input) => {
      requestUrl = String(input);

      return Response.json({
        files: [
          {
            id: 'shared-child',
            name: 'Shared child',
            mimeType: 'application/vnd.google-apps.folder',
          },
        ],
      });
    };

    const contents = await enumerateDriveFolderContents({
      accessToken: 'drive-token',
      rootFolder: createRootFolder('shared'),
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.equal(contents.folders[0]?.rootKind, 'shared');
    assert.equal(contents.folders[0]?.shared, true);
    assert.equal(
      new URL(requestUrl).searchParams.get('includeItemsFromAllDrives'),
      'true',
    );
    assert.equal(
      new URL(requestUrl).searchParams.get('supportsAllDrives'),
      'true',
    );
  });

  it('returns unsupported audio metadata separately from playable sources', async () => {
    globalThis.fetch = async () => {
      return Response.json({
        files: [
          {
            id: 'supported-track',
            name: 'Supported.mp3',
            mimeType: 'audio/mpeg',
            fileExtension: 'mp3',
          },
          {
            id: 'unsupported-track',
            name: 'Unsupported.aiff',
            mimeType: 'audio/aiff',
            fileExtension: 'aiff',
          },
        ],
      });
    };

    const contents = await enumerateDriveFolderContents({
      accessToken: 'drive-token',
      rootFolder: createRootFolder(),
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.deepEqual(
      contents.playableSources.map(({ id }) => id),
      ['drive:supported-track'],
    );
    assert.deepEqual(
      contents.unavailableSources.map(({ id, availability }) => ({
        id,
        status: availability.status,
      })),
      [{ id: 'drive:unsupported-track', status: 'unsupported' }],
    );
  });

  it('stops before requesting another folder after cancellation', async () => {
    const abortController = new AbortController();
    let requestCount = 0;

    globalThis.fetch = async () => {
      requestCount += 1;
      abortController.abort();

      return Response.json({
        files: [
          {
            id: 'folder-child',
            name: 'Child folder',
            mimeType: 'application/vnd.google-apps.folder',
          },
        ],
      });
    };

    await assert.rejects(
      enumerateDriveFolderContents({
        accessToken: 'drive-token',
        rootFolder: createRootFolder(),
        supportedMimeTypes: SUPPORTED_MIME_TYPES,
        supportedExtensions: SUPPORTED_EXTENSIONS,
        signal: abortController.signal,
      }),
      { name: 'AbortError' },
    );
    assert.equal(requestCount, 1);
  });

  it('rejects rather than returning partial contents when a descendant fails', async () => {
    let requestCount = 0;

    globalThis.fetch = async () => {
      requestCount += 1;

      if (requestCount === 1) {
        return Response.json({
          files: [
            {
              id: 'root-track',
              name: 'Root track.mp3',
              mimeType: 'audio/mpeg',
              fileExtension: 'mp3',
            },
            {
              id: 'folder-child',
              name: 'Child folder',
              mimeType: 'application/vnd.google-apps.folder',
            },
          ],
        });
      }

      return Response.json(
        { error: { message: 'Descendant listing failed' } },
        { status: 500 },
      );
    };

    await assert.rejects(
      enumerateDriveFolderContents({
        accessToken: 'drive-token',
        rootFolder: createRootFolder(),
        supportedMimeTypes: SUPPORTED_MIME_TYPES,
        supportedExtensions: SUPPORTED_EXTENSIONS,
      }),
      /Descendant listing failed/,
    );
  });
});
