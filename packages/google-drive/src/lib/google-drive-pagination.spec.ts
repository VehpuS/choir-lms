import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  MY_DRIVE_ROOT_LOCATION,
  browseDriveLocation,
  createDrivePathResolutionCache,
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

  it('reports folders after each browse page before the sources finish', async () => {
    globalThis.fetch = async (input) => {
      const pageToken = new URL(String(input)).searchParams.get('pageToken');

      if (!pageToken) {
        return Response.json({
          files: [
            ...createAudioFiles(2),
            {
              id: 'folder-page-1',
              name: 'B Folder',
              mimeType: 'application/vnd.google-apps.folder',
            },
          ],
          nextPageToken: 'browse-page-2',
        });
      }

      return Response.json({
        files: [
          {
            id: 'folder-page-2',
            name: 'A Folder',
            mimeType: 'application/vnd.google-apps.folder',
          },
        ],
      });
    };
    const folderProgress: string[][] = [];

    const snapshot = await browseDriveLocation({
      accessToken: 'drive-token',
      location: MY_DRIVE_ROOT_LOCATION,
      onFolders: (progress) => {
        // Folders only: audio sources wait for their path resolution.
        assert.equal(progress.playableSources.length, 0);
        folderProgress.push(progress.folders.map((folder) => folder.id));
      },
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.deepEqual(folderProgress, [
      ['folder-page-1'],
      ['folder-page-2', 'folder-page-1'],
    ]);
    assert.equal(snapshot.playableSources.length, 2);
  });

  it('reuses a shared path cache so a repeat browse fetches each ancestor once', async () => {
    const metadataRequests: string[] = [];

    globalThis.fetch = async (input) => {
      const url = new URL(String(input));

      if (url.pathname.endsWith('/files')) {
        return Response.json({
          files: [{ ...createAudioFiles(1)[0], parents: ['parent-folder'] }],
        });
      }

      metadataRequests.push(url.pathname);
      return Response.json({
        id: 'parent-folder',
        name: 'Parent',
        mimeType: 'application/vnd.google-apps.folder',
      });
    };
    const pathCache = createDrivePathResolutionCache();
    const browse = () =>
      browseDriveLocation({
        accessToken: 'drive-token',
        location: MY_DRIVE_ROOT_LOCATION,
        pathCache,
        supportedMimeTypes: SUPPORTED_MIME_TYPES,
        supportedExtensions: SUPPORTED_EXTENSIONS,
      });

    await browse();
    await browse();

    assert.equal(metadataRequests.length, 1);
  });
});
