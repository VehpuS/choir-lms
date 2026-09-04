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
});
