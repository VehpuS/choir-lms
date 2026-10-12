import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  MY_DRIVE_ROOT_LOCATION,
  SHARED_FOLDERS_ROOT_LOCATION,
  searchDriveAudioFiles,
} from './google-drive.js';
import { resetDriveDurationFieldSupport } from './drive-files-client.js';

const SUPPORTED_MIME_TYPES = ['audio/mpeg', 'audio/flac'];

const SUPPORTED_EXTENSIONS = ['mp3', 'flac'];

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  // The duration field memory lasts a session; each test starts a new one.
  resetDriveDurationFieldSupport();
});

describe('searchDriveAudioFiles', () => {
  it('searches accessible audio files and labels shared results', async () => {
    let requestUrl = '';

    globalThis.fetch = async (input) => {
      requestUrl = String(input);

      return new Response(
        JSON.stringify({
          files: [
            {
              id: 'drive-file-7',
              name: 'Kyrie.mp3',
              mimeType: 'audio/mpeg',
              fileExtension: 'mp3',
              shared: true,
            },
            {
              id: 'drive-file-8',
              name: 'Kyrie practice.aiff',
              mimeType: 'audio/aiff',
              fileExtension: 'aiff',
              shared: false,
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    };

    const snapshot = await searchDriveAudioFiles({
      accessToken: 'drive-token',
      query: 'Kyrie',
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.match(requestUrl, /name\+contains\+%27Kyrie%27/);
    assert.equal(snapshot.query, 'Kyrie');
    assert.equal(snapshot.playableSources[0]?.locationLabel, 'Shared with you');
    assert.equal(snapshot.unavailableSources[0]?.locationLabel, 'My Drive');
  });

  it('returns an empty snapshot for a blank query', async () => {
    const snapshot = await searchDriveAudioFiles({
      accessToken: 'drive-token',
      query: '   ',
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.equal(snapshot.query, '');
    assert.equal(snapshot.playableSources.length, 0);
    assert.equal(snapshot.unavailableSources.length, 0);
  });

  it('scopes root-level search to the selected shared root', async () => {
    let requestUrl = '';

    globalThis.fetch = async (input) => {
      requestUrl = String(input);

      return new Response(JSON.stringify({ files: [] }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    };

    await searchDriveAudioFiles({
      accessToken: 'drive-token',
      location: SHARED_FOLDERS_ROOT_LOCATION,
      query: 'Amen',
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.match(requestUrl, /sharedWithMe/);
    assert.doesNotMatch(requestUrl, /%27root%27\+in\+parents/);
  });

  it('scopes root-level search to My Drive ownership', async () => {
    let requestUrl = '';

    globalThis.fetch = async (input) => {
      requestUrl = String(input);

      return new Response(JSON.stringify({ files: [] }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    };

    await searchDriveAudioFiles({
      accessToken: 'drive-token',
      location: MY_DRIVE_ROOT_LOCATION,
      query: 'Amen',
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.match(requestUrl, /%27me%27\+in\+owners/);
    assert.doesNotMatch(requestUrl, /sharedWithMe/);
  });

  it('scopes folder search to the selected folder path', async () => {
    const requestUrls: string[] = [];

    globalThis.fetch = async (input) => {
      requestUrls.push(String(input));

      return new Response(JSON.stringify({ files: [] }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    };

    await searchDriveAudioFiles({
      accessToken: 'drive-token',
      location: {
        id: 'folder-choir-sets',
        kind: 'folder',
        name: 'Choir sets',
        rootKind: 'my-drive',
      },
      query: 'Amen',
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    const finalRequestUrl = requestUrls.at(-1) ?? '';

    assert.match(finalRequestUrl, /%27folder-choir-sets%27\+in\+parents/);
    assert.doesNotMatch(finalRequestUrl, /sharedWithMe/);
  });

  it('searches nested descendants when scoped to a folder', async () => {
    const requestUrls: string[] = [];
    let callCount = 0;

    globalThis.fetch = async (input) => {
      requestUrls.push(String(input));
      callCount += 1;

      if (callCount === 1) {
        return new Response(
          JSON.stringify({
            files: [
              {
                id: 'folder-child',
                name: 'Child folder',
                mimeType: 'application/vnd.google-apps.folder',
              },
            ],
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        );
      }

      if (callCount === 2) {
        return new Response(JSON.stringify({ files: [] }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        });
      }

      return new Response(JSON.stringify({ files: [] }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    };

    await searchDriveAudioFiles({
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

    assert.equal(requestUrls.length, 3);
    assert.match(
      requestUrls[0] ?? '',
      /mimeType\+%3D\+%27application%2Fvnd\.google-apps\.folder%27/,
    );
    assert.match(requestUrls[0] ?? '', /%27folder-root%27\+in\+parents/);
    assert.match(requestUrls[1] ?? '', /%27folder-child%27\+in\+parents/);
    assert.match(requestUrls[2] ?? '', /%27folder-root%27\+in\+parents/);
    assert.match(requestUrls[2] ?? '', /%27folder-child%27\+in\+parents/);
  });

  it('falls back to direct folder scope when descendant discovery fails', async () => {
    const requestUrls: string[] = [];
    let callCount = 0;

    globalThis.fetch = async (input) => {
      requestUrls.push(String(input));
      callCount += 1;

      if (callCount === 1) {
        return new Response(
          JSON.stringify({
            error: {
              message: 'Query failed',
            },
          }),
          {
            status: 500,
            headers: {
              'content-type': 'application/json',
            },
          },
        );
      }

      return new Response(JSON.stringify({ files: [] }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    };

    await searchDriveAudioFiles({
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

    assert.equal(requestUrls.length, 2);
    assert.match(requestUrls[1] ?? '', /%27folder-root%27\+in\+parents/);
  });
});
