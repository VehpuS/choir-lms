import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  MY_DRIVE_ROOT_LOCATION,
  SHARED_FOLDERS_ROOT_LOCATION,
  browseDriveLocation,
  getDriveAudioSource,
  getDriveAuthorizationState,
  handleDriveSourceError,
  listDriveLibrary,
  mapDriveFileToAudioSource,
  searchDriveAudioFiles,
} from './google-drive.js';

const SUPPORTED_MIME_TYPES = ['audio/mpeg', 'audio/flac'];
const SUPPORTED_EXTENSIONS = ['mp3', 'flac'];

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

describe('getDriveAuthorizationState', () => {
  it('derives unconfigured, attention, expired, and authorized states', () => {
    assert.equal(
      getDriveAuthorizationState({
        scope: 'drive.readonly',
      }).status,
      'unconfigured',
    );

    assert.equal(
      getDriveAuthorizationState({
        accessToken: 'token',
        error: 'refresh failed',
        scope: 'drive.readonly',
      }).status,
      'attention-required',
    );

    assert.equal(
      getDriveAuthorizationState(
        {
          accessToken: 'token',
          expiresAt: '2026-05-09T12:00:00.000Z',
          scope: 'drive.readonly',
        },
        new Date('2026-05-10T12:00:00.000Z'),
      ).status,
      'expired',
    );

    assert.equal(
      getDriveAuthorizationState(
        {
          accessToken: 'token',
          expiresAt: '2026-05-11T12:00:00.000Z',
          scope: 'drive.readonly',
        },
        new Date('2026-05-10T12:00:00.000Z'),
      ).status,
      'authorized',
    );
  });
});

describe('mapDriveFileToAudioSource', () => {
  it('normalizes supported Drive audio metadata into a playable source', () => {
    const source = mapDriveFileToAudioSource(
      {
        id: 'drive-file-1',
        name: 'Bass Section.FLAC',
        mimeType: 'audio/flac',
        fileExtension: 'FLAC',
        size: '4096',
        modifiedTime: '2026-05-10T10:00:00.000Z',
        audioMediaMetadata: {
          durationMillis: '180500',
        },
      },
      SUPPORTED_MIME_TYPES,
      SUPPORTED_EXTENSIONS,
    );

    assert.deepEqual(source, {
      id: 'drive:drive-file-1',
      provider: 'google-drive',
      driveFileId: 'drive-file-1',
      name: 'Bass Section.FLAC',
      mimeType: 'audio/flac',
      extension: 'flac',
      durationMs: 180500,
      sizeBytes: 4096,
      modifiedTime: '2026-05-10T10:00:00.000Z',
      webViewLink: undefined,
      iconLink: undefined,
      availability: {
        status: 'available',
      },
    });
  });

  it('marks unsupported files with an explicit availability reason', () => {
    const source = mapDriveFileToAudioSource(
      {
        id: 'drive-file-2',
        name: 'Tenor Guide.aiff',
        mimeType: 'audio/aiff',
        fileExtension: 'AIFF',
      },
      SUPPORTED_MIME_TYPES,
      SUPPORTED_EXTENSIONS,
    );

    assert.equal(source.availability.status, 'unsupported');
    assert.equal(source.availability.reason, 'unsupported-format');
    assert.equal(
      source.availability.message,
      'This Drive file format is outside the MVP audio set.',
    );
  });
});

describe('getDriveAudioSource', () => {
  it('reads a single Drive audio file by id without requiring playback metadata from the player', async () => {
    let requestUrl = '';
    let authorizationHeader = '';

    globalThis.fetch = async (input, init) => {
      requestUrl = String(input);
      authorizationHeader = String(
        init?.headers
          ? (init.headers as Record<string, string>).Authorization
          : '',
      );

      return new Response(
        JSON.stringify({
          id: 'drive-file-7',
          name: 'Choir entrance.mp3',
          mimeType: 'audio/mpeg',
          fileExtension: 'mp3',
          audioMediaMetadata: {
            durationMillis: '93000',
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    };

    const source = await getDriveAudioSource({
      accessToken: 'drive-token',
      driveFileId: 'drive-file-7',
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.match(
      requestUrl,
      /https:\/\/www\.googleapis\.com\/drive\/v3\/files\/drive-file-7\?/,
    );
    assert.match(requestUrl, /audioMediaMetadata%2FdurationMillis/);
    assert.match(requestUrl, /supportsAllDrives=true/);
    assert.equal(authorizationHeader, 'Bearer drive-token');
    assert.equal(source.id, 'drive:drive-file-7');
    assert.equal(source.durationMs, 93000);
  });
});

describe('listDriveLibrary', () => {
  it('splits playable and unavailable sources from the Drive response', async () => {
    let requestUrl = '';
    let authorizationHeader = '';

    globalThis.fetch = async (input, init) => {
      requestUrl = String(input);
      authorizationHeader = String(
        init?.headers
          ? (init.headers as Record<string, string>).Authorization
          : '',
      );

      return new Response(
        JSON.stringify({
          files: [
            {
              id: 'drive-file-1',
              name: 'Alto Line.mp3',
              mimeType: 'audio/mpeg',
              fileExtension: 'mp3',
            },
            {
              id: 'drive-file-2',
              name: 'Score PDF',
              mimeType: 'application/pdf',
              fileExtension: 'pdf',
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

    const snapshot = await listDriveLibrary({
      accessToken: 'drive-token',
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.match(
      requestUrl,
      /https:\/\/www\.googleapis\.com\/drive\/v3\/files\?/,
    );
    assert.match(requestUrl, /mimeType\+contains\+%27audio%2F%27/);
    assert.match(requestUrl, /spaces=drive/);
    assert.equal(authorizationHeader, 'Bearer drive-token');
    assert.equal(snapshot.playableSources.length, 1);
    assert.equal(snapshot.unavailableSources.length, 1);
    assert.equal(snapshot.playableSources[0]?.name, 'Alto Line.mp3');
    assert.equal(
      snapshot.unavailableSources[0]?.availability.status,
      'unsupported',
    );
  });

  it('retries with a simpler request when the initial Drive query is rejected', async () => {
    const requestUrls: string[] = [];
    let requestCount = 0;

    globalThis.fetch = async (input) => {
      requestCount += 1;
      requestUrls.push(String(input));

      if (requestCount === 1) {
        return new Response(
          JSON.stringify({
            error: {
              message:
                'Invalid field selection audioMediaMetadata/durationMillis.',
            },
          }),
          {
            status: 400,
            headers: {
              'content-type': 'application/json',
            },
          },
        );
      }

      return new Response(
        JSON.stringify({
          files: [
            {
              id: 'drive-file-4',
              name: 'Tenor Part.mp3',
              mimeType: 'audio/mpeg',
              fileExtension: 'mp3',
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

    const snapshot = await listDriveLibrary({
      accessToken: 'drive-token',
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.equal(requestCount, 2);
    assert.match(requestUrls[0] ?? '', /audioMediaMetadata%2FdurationMillis/);
    assert.match(requestUrls[0] ?? '', /supportsAllDrives=true/);
    assert.doesNotMatch(
      requestUrls[1] ?? '',
      /audioMediaMetadata%2FdurationMillis/,
    );
    assert.match(requestUrls[1] ?? '', /supportsAllDrives=true/);
    assert.equal(snapshot.playableSources.length, 1);
    assert.equal(snapshot.playableSources[0]?.name, 'Tenor Part.mp3');
  });

  it('surfaces the Drive API error body when the request fails', async () => {
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          error: {
            message:
              'Google Drive API has not been used in project 123456 before or it is disabled.',
          },
        }),
        {
          status: 403,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    };

    await assert.rejects(() => {
      return listDriveLibrary({
        accessToken: 'drive-token',
        supportedMimeTypes: SUPPORTED_MIME_TYPES,
        supportedExtensions: SUPPORTED_EXTENSIONS,
      });
    }, /Drive library request failed with 403: Google Drive API has not been used in project 123456 before or it is disabled\./);
  });

  it('maps Drive request failures onto unavailable source reasons', () => {
    const unavailableSource = handleDriveSourceError(
      mapDriveFileToAudioSource(
        {
          id: 'drive-file-3',
          name: 'Soprano Part.mp3',
          mimeType: 'audio/mpeg',
          fileExtension: 'mp3',
        },
        SUPPORTED_MIME_TYPES,
        SUPPORTED_EXTENSIONS,
      ),
      new Error('Drive library request failed with 403'),
    );

    assert.equal(unavailableSource.availability.status, 'unavailable');
    assert.equal(unavailableSource.availability.reason, 'access-revoked');
    assert.equal(
      unavailableSource.availability.message,
      'Drive library request failed with 403',
    );
  });
});

describe('browseDriveLocation', () => {
  it('lists folders alongside supported and unsupported audio in the current folder', async () => {
    let requestUrl = '';

    globalThis.fetch = async (input) => {
      requestUrl = String(input);

      return new Response(
        JSON.stringify({
          files: [
            {
              id: 'folder-1',
              name: 'Spring concert',
              mimeType: 'application/vnd.google-apps.folder',
              modifiedTime: '2026-05-20T10:00:00.000Z',
            },
            {
              id: 'drive-file-5',
              name: 'Warmup.mp3',
              mimeType: 'audio/mpeg',
              fileExtension: 'mp3',
            },
            {
              id: 'drive-file-6',
              name: 'Reference.aiff',
              mimeType: 'audio/aiff',
              fileExtension: 'aiff',
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

    const snapshot = await browseDriveLocation({
      accessToken: 'drive-token',
      location: MY_DRIVE_ROOT_LOCATION,
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.match(requestUrl, /%27root%27\+in\+parents/);
    assert.equal(snapshot.location.name, 'My Drive');
    assert.deepEqual(snapshot.folders, [
      {
        id: 'folder-1',
        name: 'Spring concert',
        modifiedTime: '2026-05-20T10:00:00.000Z',
        rootKind: 'my-drive',
        shared: false,
      },
    ]);
    assert.equal(snapshot.playableSources[0]?.name, 'Warmup.mp3');
    assert.equal(snapshot.unavailableSources[0]?.name, 'Reference.aiff');
  });

  it('uses the shared root query for shared folders', async () => {
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

    await browseDriveLocation({
      accessToken: 'drive-token',
      location: SHARED_FOLDERS_ROOT_LOCATION,
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.match(requestUrl, /sharedWithMe/);
  });
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
        return new Response(JSON.stringify({
          error: {
            message: 'Query failed',
          },
        }), {
          status: 500,
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

    assert.equal(requestUrls.length, 2);
    assert.match(requestUrls[1] ?? '', /%27folder-root%27\+in\+parents/);
  });
});
