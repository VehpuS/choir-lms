import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pruneLibraryBackups } from './drive-library-bundle-prune';
import { fakeDrive, type Call } from './drive-library-bundle-test-support';

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

describe('pruneLibraryBackups', () => {
  const stamp = (day: number) =>
    `2026-11-${String(day).padStart(2, '0')}T10:00:00.000Z`;
  const backups = [1, 2, 3, 4, 5, 6, 7].map((day) =>
    file(`b${day}`, `choir-lms-backup-${day}.json`, {
      modifiedTime: stamp(day),
    }),
  );
  const route =
    (extra: unknown[] = []) =>
    ({ method, url }: Call) =>
      method === 'GET'
        ? {
            status: 200,
            body: {
              files: [
                ...backups,
                ...extra,
                // Unmarked or foreign files in the folder are never touched.
                {
                  id: 'foreign',
                  name: 'choir-lms-backup-foreign.json',
                  modifiedTime: stamp(1),
                },
              ],
            },
          }
        : { status: 200, body: { id: url } };

  it('trashes only the oldest backups beyond the limit', async () => {
    const drive = fakeDrive(route());
    const result = await pruneLibraryBackups({
      accessToken: 't',
      fetch: drive.fetch,
      backupsFolderId: 'backups',
      keep: 5,
    });

    assert.deepEqual(result, { status: 'ok', removedIds: ['b2', 'b1'] });
    assert.equal(
      drive.calls
        .filter((c) => c.method === 'PATCH')
        .every((c) => c.body === '{"trashed":true}'),
      true,
    );
  });

  it('never removes a protected pre-restore backup', async () => {
    const preRestore = [1, 2, 3, 4, 5, 6].map((day) =>
      file(`p${day}`, `choir-lms-pre-restore-${day}.json`, {
        modifiedTime: stamp(day),
      }),
    );
    const drive = fakeDrive(route(preRestore));
    const result = await pruneLibraryBackups({
      accessToken: 't',
      fetch: drive.fetch,
      backupsFolderId: 'backups',
      keep: 5,
      protectedIds: new Set(['p1']),
    });

    assert.deepEqual(result, { status: 'ok', removedIds: ['b2', 'b1'] });
  });

  it('stops and reports when a trash request fails', async () => {
    const drive = fakeDrive(({ method }) =>
      method === 'GET'
        ? { status: 200, body: { files: backups } }
        : { status: 500 },
    );

    assert.deepEqual(
      await pruneLibraryBackups({
        accessToken: 't',
        fetch: drive.fetch,
        backupsFolderId: 'b',
        keep: 5,
      }),
      { status: 'failed', reason: 'unavailable' },
    );
  });
});
