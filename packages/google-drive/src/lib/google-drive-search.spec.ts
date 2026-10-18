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

  const ROOT_FOLDER = {
    id: 'folder-root',
    kind: 'folder' as const,
    name: 'Root folder',
    rootKind: 'my-drive' as const,
  };
  const FOLDER_MIME = 'application/vnd.google-apps.folder';
  // A listing of subfolders is the one query that does not filter by name.
  const queryOf = (input: Parameters<typeof fetch>[0]) =>
    new URL(String(input)).searchParams.get('q') ?? '';
  const isFolderListing = (query: string) => !query.includes('name contains');

  it('searches nested descendants when scoped to a folder', async () => {
    const searches: string[] = [];

    globalThis.fetch = async (input) => {
      const query = queryOf(input);

      if (isFolderListing(query)) {
        return Response.json({
          files: query.includes("'folder-root' in parents")
            ? [{ id: 'folder-child', mimeType: FOLDER_MIME, name: 'Child' }]
            : [],
        });
      }

      searches.push(query);

      return Response.json({ files: [] });
    };

    await searchDriveAudioFiles({
      accessToken: 'drive-token',
      location: ROOT_FOLDER,
      query: 'Amen',
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    // The folder is searched first and its subfolder as it is discovered.
    assert.equal(searches.length, 2);
    assert.ok(searches[0]?.includes("'folder-root' in parents"));
    assert.ok(!searches[0]?.includes("'folder-child' in parents"));
    assert.ok(searches[1]?.includes("'folder-child' in parents"));
  });

  it('still searches the folder itself when its subfolders cannot be listed', async () => {
    const searches: string[] = [];

    globalThis.fetch = async (input) => {
      const query = queryOf(input);

      if (isFolderListing(query)) {
        return Response.json(
          { error: { message: 'Query failed' } },
          { status: 500 },
        );
      }

      searches.push(query);

      return Response.json({ files: [] });
    };

    await searchDriveAudioFiles({
      accessToken: 'drive-token',
      location: ROOT_FOLDER,
      query: 'Amen',
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.equal(searches.length, 1);
    assert.ok(searches[0]?.includes("'folder-root' in parents"));
  });
});
