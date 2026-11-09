import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  lookupDriveFileOwners,
  probeDriveFilesAccess,
} from './drive-file-access';
import type { DriveBundleFetch } from './drive-library-bundle-files';
import { fakeDrive } from './drive-library-bundle-test-support';

describe('probeDriveFilesAccess', () => {
  it('maps 200 to accessible, 404 and 403 to needs-access and anything else to unknown', async () => {
    const statuses: Record<string, number> = {
      a: 200,
      b: 404,
      c: 403,
      d: 500,
      e: 401,
    };
    const drive = fakeDrive(({ url }) => ({
      status:
        statuses[decodeURIComponent(url.split('/files/')[1].split('?')[0])],
    }));
    const { access } = await probeDriveFilesAccess({
      accessToken: 't',
      fetch: drive.fetch,
      fileIds: ['a', 'b', 'c', 'd', 'e', 'a'],
    });

    assert.deepEqual(
      [...access.entries()],
      [
        ['a', 'accessible'],
        ['b', 'needs-access'],
        ['c', 'needs-access'],
        ['d', 'unknown'],
        ['e', 'unknown'],
      ],
    );
    assert.equal(drive.calls.length, 5);
  });

  it('never has more than the limit in flight', async () => {
    let inFlight = 0;
    let peak = 0;
    const fetch: DriveBundleFetch = async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 2));
      inFlight -= 1;

      return {
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => '',
      };
    };

    await probeDriveFilesAccess({
      accessToken: 't',
      fetch,
      fileIds: Array.from({ length: 12 }, (_, i) => `f${i}`),
      concurrency: 3,
    });

    assert.equal(peak, 3);
  });

  it('stops probing once aborted and says so', async () => {
    const controller = new AbortController();
    const drive = fakeDrive(() => {
      controller.abort();

      return { status: 200 };
    });
    const result = await probeDriveFilesAccess({
      accessToken: 't',
      fetch: drive.fetch,
      fileIds: ['a', 'b', 'c', 'd'],
      concurrency: 1,
      signal: controller.signal,
    });

    assert.equal(result.aborted, true);
    assert.equal(drive.calls.length, 1);
  });
});

describe('lookupDriveFileOwners', () => {
  it('returns owners where Drive reports them and skips failures', async () => {
    const drive = fakeDrive(({ url }) =>
      url.includes('/a?')
        ? {
            status: 200,
            body: {
              owners: [{ displayName: 'Ann', emailAddress: 'ann@example.com' }],
            },
          }
        : url.includes('/b?')
          ? { status: 200, body: {} }
          : { status: 404 },
    );
    const owners = await lookupDriveFileOwners({
      accessToken: 't',
      fetch: drive.fetch,
      fileIds: ['a', 'b', 'c'],
    });

    assert.deepEqual(
      [...owners.entries()],
      [['a', { name: 'Ann', email: 'ann@example.com' }]],
    );
  });
});
