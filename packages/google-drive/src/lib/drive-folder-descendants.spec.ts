import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { walkFolderTree } from './drive-folder-descendants.js';
import type { DriveFileMetadata } from './google-drive-core.js';

const ORIGINAL_FETCH = globalThis.fetch;
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

const folder = (id: string): DriveFileMetadata => ({
  id,
  mimeType: FOLDER_MIME_TYPE,
  name: id,
});

// A fake Drive: each folder id maps to its subfolders, and a listing query
// returns the subfolders of every parent it names.
const fakeDrive = (children: Record<string, string[]>) => {
  globalThis.fetch = async (input) => {
    const query = new URL(String(input)).searchParams.get('q') ?? '';
    const parents = [...query.matchAll(/'([^']+)' in parents/g)].map(
      (match) => match[1] ?? '',
    );

    return Response.json({
      files: parents.flatMap((parent) => (children[parent] ?? []).map(folder)),
    });
  };
};

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

describe('walkFolderTree', () => {
  it('visits the root first and then each level of subfolders', async () => {
    fakeDrive({ root: ['a', 'b'], a: ['c'] });
    const visited: string[][] = [];

    const result = await walkFolderTree({
      accessToken: 'token',
      rootFolderId: 'root',
      visit: async (ids) => {
        visited.push(ids);
      },
    });

    assert.deepEqual(visited, [['root'], ['a', 'b'], ['c']]);
    assert.equal(result.isIncomplete, false);
  });

  it('splits a wide level into batches of 20 folders', async () => {
    const wide = Array.from({ length: 45 }, (_, index) => `f${index}`);

    fakeDrive({ root: wide });
    const batchSizes: number[] = [];

    await walkFolderTree({
      accessToken: 'token',
      rootFolderId: 'root',
      visit: async (ids) => {
        batchSizes.push(ids.length);
      },
    });

    assert.deepEqual(batchSizes, [1, 20, 20, 5]);
  });

  it('never visits a folder twice', async () => {
    fakeDrive({ root: ['a', 'b'], a: ['b'] });
    const visited: string[] = [];

    await walkFolderTree({
      accessToken: 'token',
      rootFolderId: 'root',
      visit: async (ids) => {
        visited.push(...ids);
      },
    });

    assert.deepEqual([...visited].sort(), ['a', 'b', 'root']);
  });

  it('stops between batches when asked to', async () => {
    fakeDrive({ root: ['a'], a: ['b'] });
    const visited: string[][] = [];

    await walkFolderTree({
      accessToken: 'token',
      rootFolderId: 'root',
      shouldStop: () => visited.length >= 1,
      visit: async (ids) => {
        visited.push(ids);
      },
    });

    assert.deepEqual(visited, [['root']]);
  });

  it('reports a folder that could not be listed instead of throwing', async () => {
    globalThis.fetch = async () => new Response('', { status: 500 });
    const visited: string[][] = [];

    const result = await walkFolderTree({
      accessToken: 'token',
      rootFolderId: 'root',
      visit: async (ids) => {
        visited.push(ids);
      },
    });

    assert.deepEqual(visited, [['root']]);
    assert.equal(result.isIncomplete, true);
  });

  it('throws when visiting a batch fails', async () => {
    fakeDrive({ root: [] });

    await assert.rejects(
      walkFolderTree({
        accessToken: 'token',
        rootFolderId: 'root',
        visit: async () => {
          throw new Error('search failed');
        },
      }),
      /search failed/,
    );
  });
});
