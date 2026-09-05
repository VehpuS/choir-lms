import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  MY_DRIVE_ROOT_LOCATION,
  browseDriveLocation,
  searchDriveAudioFiles,
} from './google-drive.js';

const SUPPORTED_MIME_TYPES = ['audio/mpeg'];
const SUPPORTED_EXTENSIONS = ['mp3'];
const ORIGINAL_FETCH = globalThis.fetch;

const createAudioFiles = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: `drive-file-${index + 1}`,
    name: `Track ${String(index + 1).padStart(3, '0')}.mp3`,
    mimeType: 'audio/mpeg',
    fileExtension: 'mp3',
  }));
};

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

describe('Drive discovery pagination', () => {
  it('includes browse results beyond the first 100 items', async () => {
    const requestUrls: string[] = [];

    globalThis.fetch = async (input) => {
      const requestUrl = String(input);
      requestUrls.push(requestUrl);
      const pageToken = new URL(requestUrl).searchParams.get('pageToken');

      if (!pageToken) {
        return Response.json({
          files: createAudioFiles(100),
          nextPageToken: 'browse-page-2',
        });
      }

      return Response.json({
        files: [
          {
            id: 'folder-page-2',
            name: 'A Page Two Folder',
            mimeType: 'application/vnd.google-apps.folder',
          },
          {
            id: 'unsupported-page-2',
            name: 'Reference.aiff',
            mimeType: 'audio/aiff',
            fileExtension: 'aiff',
          },
        ],
      });
    };

    const snapshot = await browseDriveLocation({
      accessToken: 'drive-token',
      location: MY_DRIVE_ROOT_LOCATION,
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.equal(requestUrls.length, 2);
    assert.equal(
      new URL(requestUrls[1] ?? '').searchParams.get('pageToken'),
      'browse-page-2',
    );
    assert.equal(snapshot.playableSources.length, 100);
    assert.equal(snapshot.folders[0]?.id, 'folder-page-2');
    assert.equal(
      snapshot.unavailableSources[0]?.id,
      'drive:unsupported-page-2',
    );
  });

  it('includes and sorts unscoped search results beyond the first 100 items', async () => {
    const requestUrls: string[] = [];

    globalThis.fetch = async (input) => {
      const requestUrl = String(input);
      requestUrls.push(requestUrl);
      const pageToken = new URL(requestUrl).searchParams.get('pageToken');

      if (!pageToken) {
        return Response.json({
          files: createAudioFiles(100),
          nextPageToken: 'search-page-2',
        });
      }

      return Response.json({
        files: [
          {
            id: 'search-page-2-supported',
            name: 'A First Result.mp3',
            mimeType: 'audio/mpeg',
            fileExtension: 'mp3',
            shared: true,
          },
          {
            id: 'search-page-2-unsupported',
            name: 'Z Last Result.aiff',
            mimeType: 'audio/aiff',
            fileExtension: 'aiff',
          },
        ],
      });
    };

    const snapshot = await searchDriveAudioFiles({
      accessToken: 'drive-token',
      query: 'Result',
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.equal(requestUrls.length, 2);
    assert.equal(
      new URL(requestUrls[1] ?? '').searchParams.get('pageToken'),
      'search-page-2',
    );
    assert.equal(snapshot.playableSources.length, 101);
    assert.equal(
      snapshot.playableSources[0]?.id,
      'drive:search-page-2-supported',
    );
    assert.equal(snapshot.playableSources[0]?.locationLabel, 'Shared with you');
    assert.equal(
      snapshot.unavailableSources[0]?.id,
      'drive:search-page-2-unsupported',
    );
  });

  it('paginates bounded descendant discovery and deep folder-scoped search', async () => {
    const requestUrls: string[] = [];
    const firstPageFolders = Array.from({ length: 20 }, (_, index) => ({
      id: `child-${index + 1}`,
      name: `Child ${index + 1}`,
      mimeType: 'application/vnd.google-apps.folder',
    }));

    globalThis.fetch = async (input) => {
      const requestUrl = String(input);
      const searchParams = new URL(requestUrl).searchParams;
      const query = searchParams.get('q') ?? '';
      const pageToken = searchParams.get('pageToken');
      requestUrls.push(requestUrl);

      if (query.includes("mimeType = 'application/vnd.google-apps.folder'")) {
        if (query.includes("'folder-root' in parents")) {
          if (pageToken === 'descendants-page-2') {
            return Response.json({
              files: [
                {
                  id: 'child-21',
                  name: 'Child 21',
                  mimeType: 'application/vnd.google-apps.folder',
                },
              ],
            });
          }

          return Response.json({
            files: firstPageFolders,
            nextPageToken: 'descendants-page-2',
          });
        }

        if (query.includes("'child-21' in parents")) {
          return Response.json({
            files: [
              {
                id: 'grandchild',
                name: 'Grandchild',
                mimeType: 'application/vnd.google-apps.folder',
              },
            ],
          });
        }

        return Response.json({ files: [] });
      }

      if (query.includes("'grandchild' in parents")) {
        if (pageToken === 'search-page-2') {
          return Response.json({
            files: [
              {
                id: 'deep-page-2-track',
                name: 'Deep Amen.mp3',
                mimeType: 'audio/mpeg',
                fileExtension: 'mp3',
              },
            ],
          });
        }

        return Response.json({
          files: [],
          nextPageToken: 'search-page-2',
        });
      }

      return Response.json({ files: [] });
    };

    const snapshot = await searchDriveAudioFiles({
      accessToken: 'drive-token',
      location: {
        id: 'folder-root',
        kind: 'folder',
        name: 'Root folder',
        rootKind: 'my-drive',
      },
      query: 'Amen',
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.deepEqual(
      snapshot.playableSources.map(({ id }) => id),
      ['drive:deep-page-2-track'],
    );
    assert.equal(
      requestUrls.some((requestUrl) => {
        return (
          new URL(requestUrl).searchParams.get('pageToken') ===
          'descendants-page-2'
        );
      }),
      true,
    );
    assert.equal(
      requestUrls.some((requestUrl) => {
        return (
          new URL(requestUrl).searchParams.get('pageToken') === 'search-page-2'
        );
      }),
      true,
    );

    for (const requestUrl of requestUrls) {
      const query = new URL(requestUrl).searchParams.get('q') ?? '';
      const parentCount = query.match(/ in parents/g)?.length ?? 0;

      assert.ok(parentCount <= 20);
    }
  });

  it('rejects a folder-scoped search when a later result page fails', async () => {
    let requestCount = 0;

    globalThis.fetch = async () => {
      requestCount += 1;

      if (requestCount === 1) {
        return Response.json({ files: [] });
      }

      if (requestCount === 2) {
        return Response.json({
          files: createAudioFiles(100),
          nextPageToken: 'search-page-2',
        });
      }

      return Response.json(
        { error: { message: 'Later search page failed' } },
        { status: 500 },
      );
    };

    await assert.rejects(
      searchDriveAudioFiles({
        accessToken: 'drive-token',
        location: {
          id: 'folder-root',
          kind: 'folder',
          name: 'Root folder',
          rootKind: 'my-drive',
        },
        query: 'Amen',
        supportedMimeTypes: SUPPORTED_MIME_TYPES,
        supportedExtensions: SUPPORTED_EXTENSIONS,
      }),
      /Later search page failed/,
    );
  });
});
