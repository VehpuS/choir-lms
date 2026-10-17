import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  SHEET_MUSIC_SEARCH_PAGE_LIMIT,
  searchDriveSheetMusic,
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

describe('searchDriveSheetMusic inside a folder', () => {
  const FOLDER = {
    id: 'folder-a',
    kind: 'folder' as const,
    name: 'A',
    rootKind: 'my-drive' as const,
  };
  const isFolderListing = (query: string) => !query.includes('name contains');

  it('searches the folder and every folder under it', async () => {
    const searches: string[] = [];

    globalThis.fetch = async (input) => {
      const query = new URL(String(input)).searchParams.get('q') ?? '';

      if (isFolderListing(query)) {
        return Response.json({
          files: query.includes("'folder-a' in parents")
            ? [file('Child', FOLDER_MIME_TYPE, 'folder-b')]
            : [],
        });
      }

      searches.push(query);

      return Response.json({ files: [file('Kyrie.pdf', 'application/pdf')] });
    };

    const listing = await searchDriveSheetMusic({
      accessToken: 'token',
      location: FOLDER,
      query: 'kyrie',
    });

    // The folder is searched first and its subfolder as it is discovered.
    assert.equal(searches.length, 2);
    assert.ok(searches[0]?.includes("'folder-a' in parents"));
    assert.ok(searches[1]?.includes("'folder-b' in parents"));
    assert.deepEqual(
      listing.files.map(({ name }) => name),
      ['Kyrie.pdf'],
    );
  });

  it('still searches the folder, and says more may exist, when its subfolders cannot be listed', async () => {
    const searches: string[] = [];

    globalThis.fetch = async (input) => {
      const query = new URL(String(input)).searchParams.get('q') ?? '';

      if (isFolderListing(query)) {
        return new Response('', { status: 500 });
      }

      searches.push(query);

      return Response.json({ files: [file('Kyrie.pdf', 'application/pdf')] });
    };

    const listing = await searchDriveSheetMusic({
      accessToken: 'token',
      location: FOLDER,
      query: 'kyrie',
    });

    assert.equal(searches.length, 1);
    assert.ok(searches[0]?.includes("'folder-a' in parents"));
    assert.equal(listing.files.length, 1);
    assert.equal(listing.hasMore, true);
  });

  it('does not report more when a folder search ends before the limit', async () => {
    globalThis.fetch = async (input) => {
      const query = new URL(String(input)).searchParams.get('q') ?? '';

      return Response.json({
        files: isFolderListing(query)
          ? []
          : [file('Kyrie.pdf', 'application/pdf')],
      });
    };

    const listing = await searchDriveSheetMusic({
      accessToken: 'token',
      location: FOLDER,
      query: 'kyrie',
    });

    assert.equal(listing.hasMore, undefined);
  });

  it('reports matches to the caller as each batch of folders is searched', async () => {
    globalThis.fetch = async (input) => {
      const query = new URL(String(input)).searchParams.get('q') ?? '';

      if (isFolderListing(query)) {
        return Response.json({
          files: query.includes("'folder-a' in parents")
            ? [file('Child', FOLDER_MIME_TYPE, 'folder-b')]
            : [],
        });
      }

      return Response.json({
        files: [
          query.includes("'folder-b' in parents")
            ? file('Deep.pdf', 'application/pdf')
            : file('Top.pdf', 'application/pdf'),
        ],
      });
    };
    const seen: string[][] = [];

    await searchDriveSheetMusic({
      accessToken: 'token',
      location: FOLDER,
      onProgress: (progress) => {
        seen.push(progress.files.map(({ name }) => name));
      },
      query: 'pdf',
    });

    assert.deepEqual(seen, [['Top.pdf'], ['Deep.pdf', 'Top.pdf']]);
  });

  it('stops a large folder search once it has read enough and says more exist', async () => {
    const CHILD_FOLDER_COUNT = 25;
    const PAGE_SIZE = 100;
    let searchRequests = 0;
    let counter = 0;

    globalThis.fetch = async (input) => {
      const query = new URL(String(input)).searchParams.get('q') ?? '';

      if (isFolderListing(query)) {
        return Response.json({
          files: query.includes("'folder-a' in parents")
            ? Array.from({ length: CHILD_FOLDER_COUNT }, (_, index) =>
                file(`Child ${index}`, FOLDER_MIME_TYPE, `child-${index}`),
              )
            : [],
        });
      }

      searchRequests += 1;

      return Response.json({
        files: Array.from({ length: PAGE_SIZE }, () => {
          counter += 1;

          return file(`Kyrie ${counter}.pdf`, 'application/pdf');
        }),
        nextPageToken: `page-${searchRequests + 1}`,
      });
    };

    const listing = await searchDriveSheetMusic({
      accessToken: 'token',
      location: FOLDER,
      query: 'kyrie',
    });

    // 26 folders make two query batches, but the first already fills the limit.
    assert.equal(searchRequests, SHEET_MUSIC_SEARCH_PAGE_LIMIT);
    assert.equal(listing.hasMore, true);
  });
});
