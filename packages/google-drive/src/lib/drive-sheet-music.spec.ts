import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  MY_DRIVE_ROOT_LOCATION,
  SHARED_FOLDERS_ROOT_LOCATION,
} from './drive-file-queries.js';
import {
  createBrowseQuery,
  createDriveSearchQuery,
} from './drive-file-queries.js';
import {
  SHEET_MUSIC_SEARCH_PAGE_LIMIT,
  browseDriveSheetMusic,
  searchDriveSheetMusic,
  toDriveSheetMusicListing,
} from './drive-sheet-music.js';
import type { DriveFileMetadata } from './google-drive-core.js';

const ORIGINAL_FETCH = globalThis.fetch;
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

const file = (
  name: string,
  mimeType: string,
  id = name,
): DriveFileMetadata => ({
  id,
  mimeType,
  name,
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

describe('sheet music queries', () => {
  it('keeps the audio queries unchanged by default', () => {
    assert.ok(
      createBrowseQuery(MY_DRIVE_ROOT_LOCATION).includes(
        "mimeType contains 'audio/'",
      ),
    );
    assert.ok(
      createDriveSearchQuery('kyrie').includes("mimeType contains 'audio/'"),
    );
  });

  it('browses folders and the sheet music types, never every audio file', () => {
    const query = createBrowseQuery(MY_DRIVE_ROOT_LOCATION, 'sheet-music');

    assert.ok(query.includes("'root' in parents"));
    assert.ok(query.includes(`mimeType = '${FOLDER_MIME_TYPE}'`));
    assert.ok(query.includes("mimeType = 'application/pdf'"));
    assert.ok(query.includes("mimeType = 'application/octet-stream'"));
    assert.ok(query.includes("mimeType contains 'musicxml'"));
    assert.ok(query.includes("mimeType contains 'midi'"));
    assert.ok(!query.includes("mimeType contains 'audio/'"));
  });

  it('browses what is shared with the user from the shared root', () => {
    assert.ok(
      createBrowseQuery(SHARED_FOLDERS_ROOT_LOCATION, 'sheet-music').includes(
        'sharedWithMe',
      ),
    );
  });

  it('searches by name with the same type filter and escapes the text', () => {
    const query = createDriveSearchQuery("Ave's", undefined, [], 'sheet-music');

    assert.ok(query.includes("name contains 'Ave\\'s'"));
    assert.ok(query.includes("mimeType = 'application/pdf'"));
  });
});

describe('toDriveSheetMusicListing', () => {
  it('keeps supported files by extension even when Drive reports a generic type', () => {
    const listing = toDriveSheetMusicListing(
      [
        file('Kyrie.mxl', 'application/octet-stream'),
        file('Gloria.musicxml', 'application/xml'),
        file('Credo.mscz', 'application/octet-stream'),
        file('Sanctus.mid', 'audio/midi'),
        file('Agnus.pdf', 'application/pdf'),
      ],
      'my-drive',
    );

    assert.deepEqual(
      listing.files.map(({ name, format }) => [name, format]),
      [
        ['Agnus.pdf', 'pdf'],
        ['Credo.mscz', 'musescore'],
        ['Gloria.musicxml', 'musicxml'],
        ['Kyrie.mxl', 'musicxml'],
        ['Sanctus.mid', 'midi'],
      ],
    );
  });

  it('hides files the app cannot use', () => {
    const listing = toDriveSheetMusicListing(
      [
        file('notes.docx', 'application/octet-stream'),
        file('backup', 'application/octet-stream'),
        file('song.mp3', 'audio/mpeg'),
        file('Kyrie.pdf', 'application/pdf'),
      ],
      'my-drive',
    );

    assert.deepEqual(
      listing.files.map(({ name }) => name),
      ['Kyrie.pdf'],
    );
  });

  it('lists folders for navigation, sorted by name with numbers in order', () => {
    const listing = toDriveSheetMusicListing(
      [
        file('Scores 10', FOLDER_MIME_TYPE, 'f10'),
        file('Scores 2', FOLDER_MIME_TYPE, 'f2'),
      ],
      'shared',
    );

    assert.deepEqual(
      listing.folders.map(({ id, rootKind }) => [id, rootKind]),
      [
        ['f2', 'shared'],
        ['f10', 'shared'],
      ],
    );
  });
});

describe('browseDriveSheetMusic and searchDriveSheetMusic', () => {
  it('requests the sheet music browse query and returns the supported files', async () => {
    const queries: string[] = [];

    globalThis.fetch = async (input) => {
      queries.push(new URL(String(input)).searchParams.get('q') ?? '');

      return Response.json({
        files: [
          file('Kyrie.pdf', 'application/pdf'),
          file('Notes.txt', 'application/octet-stream'),
        ],
      });
    };

    const listing = await browseDriveSheetMusic({
      accessToken: 'token',
      location: MY_DRIVE_ROOT_LOCATION,
    });

    assert.deepEqual(queries, [
      createBrowseQuery(MY_DRIVE_ROOT_LOCATION, 'sheet-music'),
    ]);
    assert.deepEqual(
      listing.files.map(({ name }) => name),
      ['Kyrie.pdf'],
    );
  });

  it('does not search for an empty query', async () => {
    globalThis.fetch = async () => {
      throw new Error('no request expected');
    };

    assert.deepEqual(
      await searchDriveSheetMusic({ accessToken: 'token', query: '  ' }),
      { files: [], folders: [] },
    );
  });

  it('stops a broad search at its page limit and says more exist', async () => {
    let requests = 0;

    globalThis.fetch = async () => {
      requests += 1;

      return Response.json({
        files: [file(`Kyrie ${requests}.pdf`, 'application/pdf')],
        nextPageToken: `page-${requests + 1}`,
      });
    };

    const listing = await searchDriveSheetMusic({
      accessToken: 'token',
      query: 'pdf',
    });

    assert.equal(requests, SHEET_MUSIC_SEARCH_PAGE_LIMIT);
    assert.equal(listing.files.length, SHEET_MUSIC_SEARCH_PAGE_LIMIT);
    assert.equal(listing.hasMore, true);
  });

  it('lists files only in search results, not the folders that match the name', async () => {
    globalThis.fetch = async () =>
      Response.json({
        files: [
          file('Kyrie Scores', FOLDER_MIME_TYPE, 'folder-1'),
          file('Kyrie.pdf', 'application/pdf'),
        ],
      });

    const listing = await searchDriveSheetMusic({
      accessToken: 'token',
      query: 'kyrie',
    });

    assert.deepEqual(listing.folders, []);
    assert.deepEqual(
      listing.files.map(({ name }) => name),
      ['Kyrie.pdf'],
    );
  });

  it('does not report more when the search ends before the limit', async () => {
    globalThis.fetch = async () =>
      Response.json({ files: [file('Kyrie.pdf', 'application/pdf')] });

    const listing = await searchDriveSheetMusic({
      accessToken: 'token',
      query: 'kyrie',
    });

    assert.equal(listing.hasMore, undefined);
  });

  it('searches Drive by name for sheet music', async () => {
    const queries: string[] = [];

    globalThis.fetch = async (input) => {
      queries.push(new URL(String(input)).searchParams.get('q') ?? '');

      return Response.json({
        files: [file('Kyrie.mxl', 'application/octet-stream')],
      });
    };

    const listing = await searchDriveSheetMusic({
      accessToken: 'token',
      query: ' Kyrie ',
    });

    assert.deepEqual(queries, [
      createDriveSearchQuery('Kyrie', undefined, [], 'sheet-music'),
    ]);
    assert.equal(listing.files[0]?.format, 'musicxml');
  });
});
