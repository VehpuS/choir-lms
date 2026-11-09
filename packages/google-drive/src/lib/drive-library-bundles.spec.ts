import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { uploadLibraryBundle } from './drive-library-bundle-files';
import {
  listLibraryBundles,
  readLibraryBundleText,
} from './drive-library-bundle-listing';
import {
  createBundleFileName,
  ensureLibraryBundleFolders,
  getBundleFileKind,
} from './drive-library-bundle-folders';
import { fakeDrive } from './drive-library-bundle-test-support';

const file = (
  id: string,
  name: string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  name,
  modifiedTime: '2026-11-09T10:00:00.000Z',
  appProperties: { choirlmsBundle: 'v1' },
  ...extra,
});

describe('bundle folders and names', () => {
  it('ensures Choir LMS with Backups and Shares beneath it', async () => {
    const created: string[] = [];
    const drive = fakeDrive(({ method, body }) => {
      if (method === 'GET') {
        return { status: 200, body: { files: [] } };
      }

      const name = JSON.parse(body ?? '{}').name as string;

      created.push(name);

      return { status: 200, body: { id: `id-${name}`, name } };
    });
    const result = await ensureLibraryBundleFolders({
      accessToken: 't',
      fetch: drive.fetch as never,
    });

    assert.equal(result.status, 'ready');
    assert.deepEqual(created, ['Choir LMS', 'Backups', 'Shares']);
    assert.equal(
      result.status === 'ready' && result.folders.backups.id,
      'id-Backups',
    );
  });

  it('stops and reports why when a folder cannot be created', async () => {
    const drive = fakeDrive(({ method }) =>
      method === 'GET' ? { status: 200, body: { files: [] } } : { status: 401 },
    );
    const result = await ensureLibraryBundleFolders({
      accessToken: 't',
      fetch: drive.fetch as never,
    });

    assert.deepEqual(result, {
      status: 'failed',
      reason: 'needs-write-access',
    });
  });

  it('names dated files and recognises its own names', () => {
    const date = new Date('2026-11-09T15:30:45.000Z');

    assert.equal(
      createBundleFileName({ kind: 'backup', date }),
      'choir-lms-backup-2026-11-09T1530.json',
    );
    assert.equal(
      createBundleFileName({ kind: 'pre-restore', date }),
      'choir-lms-pre-restore-2026-11-09T1530.json',
    );
    assert.equal(
      createBundleFileName({
        kind: 'share',
        date,
        label: 'Soprano/Alto: parts',
      }),
      'choir-lms-share-Soprano Alto parts 2026-11-09T1530.json',
    );
    assert.equal(getBundleFileKind('choir-lms-backup-x.json'), 'backup');
    assert.equal(getBundleFileKind('holiday.json'), null);
  });
});

describe('uploadLibraryBundle', () => {
  const session = {
    status: 200,
    headers: { Location: 'https://upload/session' },
  };

  it('marks the file as a bundle and uploads it into the folder', async () => {
    const drive = fakeDrive(({ method }) =>
      method === 'POST'
        ? session
        : { status: 200, body: { id: 'f1', name: 'b.json' } },
    );
    const result = await uploadLibraryBundle({
      accessToken: 't',
      fetch: drive.resumable,
      folderId: 'backups',
      json: '{"formatVersion":1}',
      name: 'b.json',
    });
    const metadata = JSON.parse(drive.calls[0].body ?? '{}');

    assert.deepEqual(result, {
      status: 'uploaded',
      file: { id: 'f1', name: 'b.json' },
    });
    assert.deepEqual(metadata.appProperties, { choirlmsBundle: 'v1' });
    assert.deepEqual(metadata.parents, ['backups']);
  });

  it('reports a failure and leaves no file when the session cannot start', async () => {
    const drive = fakeDrive(() => ({
      status: 403,
      body: { error: { errors: [{ reason: 'storageQuotaExceeded' }] } },
    }));
    const result = await uploadLibraryBundle({
      accessToken: 't',
      fetch: drive.resumable,
      folderId: 'backups',
      json: '{}',
      name: 'b.json',
    });

    assert.deepEqual(result, { status: 'failed', reason: 'quota' });
    assert.equal(drive.calls.length, 1);
  });
});

describe('listLibraryBundles', () => {
  it('merges the user’s folders with files shared with them, newest first, mine winning', async () => {
    const drive = fakeDrive(({ url }) => {
      const q = decodeURIComponent(new URL(url).searchParams.get('q') ?? '');

      return q.includes('sharedWithMe')
        ? {
            status: 200,
            body: {
              files: [
                file('s1', 'choir-lms-share-Messiah x.json', {
                  modifiedTime: '2026-11-10T10:00:00.000Z',
                  owners: [
                    { displayName: 'Dana', emailAddress: 'dana@example.com' },
                  ],
                  size: '2048',
                }),
                file('m1', 'choir-lms-backup-a.json'),
              ],
            },
          }
        : {
            status: 200,
            body: { files: [file('m1', 'choir-lms-backup-a.json')] },
          };
    });
    const result = await listLibraryBundles({
      accessToken: 't',
      fetch: drive.fetch,
      folderIds: ['backups', 'shares'],
    });

    assert.equal(result.status, 'ok');

    const bundles = result.status === 'ok' ? result.bundles : [];

    assert.deepEqual(
      bundles.map((b) => [b.id, b.origin, b.kind]),
      [
        ['s1', 'shared', 'share'],
        ['m1', 'mine', 'backup'],
      ],
    );
    assert.deepEqual(bundles[0].owner, {
      name: 'Dana',
      email: 'dana@example.com',
    });
    assert.equal(bundles[0].sizeBytes, 2048);
  });

  it('finds a copy that lost the app property by its name, and ignores unrelated files', async () => {
    const drive = fakeDrive(() => ({
      status: 200,
      body: {
        files: [
          { id: 'copy', name: 'choir-lms-backup-copy.json' },
          { id: 'other', name: 'choir-lms-notes.json' },
        ],
      },
    }));
    const result = await listLibraryBundles({
      accessToken: 't',
      fetch: drive.fetch,
      folderIds: [],
    });

    assert.deepEqual(
      result.status === 'ok'
        ? result.bundles.map((b) => [b.id, b.marked])
        : null,
      [['copy', false]],
    );
    // With no folders the first search is skipped; only sharedWithMe is asked.
    assert.equal(drive.calls.length, 1);
  });

  it('reports a failed search', async () => {
    const drive = fakeDrive(() => ({ status: 500 }));

    assert.deepEqual(
      await listLibraryBundles({
        accessToken: 't',
        fetch: drive.fetch,
        folderIds: ['b'],
      }),
      { status: 'failed', reason: 'unavailable' },
    );
  });
});

describe('readLibraryBundleText', () => {
  it('returns the text and reports an unreadable file', async () => {
    const ok = fakeDrive(() => ({ status: 200, text: '{"a":1}' }));
    const missing = fakeDrive(() => ({ status: 404 }));

    assert.deepEqual(
      await readLibraryBundleText({
        accessToken: 't',
        fetch: ok.fetch,
        fileId: 'x',
      }),
      { status: 'ok', text: '{"a":1}' },
    );
    assert.deepEqual(
      await readLibraryBundleText({
        accessToken: 't',
        fetch: missing.fetch,
        fileId: 'x',
      }),
      { status: 'failed', reason: 'folder-not-writable' },
    );
  });
});

describe('bundle counts on the file', () => {
  it('stores counts when given and reads them back in the listing', async () => {
    const upload = fakeDrive(({ method }) =>
      method === 'POST'
        ? { status: 200, headers: { Location: 'https://upload/session' } }
        : { status: 200, body: { id: 'f1', name: 'b.json' } },
    );

    await uploadLibraryBundle({
      accessToken: 't',
      counts: { tracks: 46, loops: 12, playlists: 5 },
      fetch: upload.resumable,
      folderId: 'backups',
      json: '{}',
      name: 'b.json',
    });

    assert.deepEqual(JSON.parse(upload.calls[0].body ?? '{}').appProperties, {
      choirlmsBundle: 'v1',
      choirlmsCounts: '46,12,5',
    });

    const list = fakeDrive(() => ({
      status: 200,
      body: {
        files: [
          file('a', 'choir-lms-backup-a.json', {
            appProperties: { choirlmsBundle: 'v1', choirlmsCounts: '46,12,5' },
          }),
          file('b', 'choir-lms-backup-b.json', {
            appProperties: { choirlmsBundle: 'v1', choirlmsCounts: 'oops' },
          }),
        ],
      },
    }));
    const result = await listLibraryBundles({
      accessToken: 't',
      fetch: list.fetch,
    });

    assert.deepEqual(
      result.status === 'ok' ? result.bundles.map((b) => b.counts) : null,
      [{ tracks: 46, loops: 12, playlists: 5 }, undefined],
    );
  });
});
