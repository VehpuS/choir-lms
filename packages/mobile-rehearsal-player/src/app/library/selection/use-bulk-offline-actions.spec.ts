import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  describeKeepDownload,
  getKeepResultAcknowledgment,
} from './use-bulk-offline-actions.js';

const MB = 1024 * 1024;

describe('bulk offline copy', () => {
  it('sums the size of files that are not stored yet', () => {
    const sources = [
      { driveFileId: 'a', sizeBytes: 3 * MB },
      { driveFileId: 'b', sizeBytes: 2 * MB },
      { driveFileId: 'c', sizeBytes: 100 * MB },
    ];

    assert.equal(
      describeKeepDownload(sources, (id) => id === 'c'),
      'This downloads 2 files, 5.0 MB.',
    );
  });

  it('says so when a size is unknown, rather than understating the download', () => {
    assert.equal(
      describeKeepDownload(
        [{ driveFileId: 'a' }, { driveFileId: 'b', sizeBytes: MB }],
        () => false,
      ),
      'This downloads 2 files, at least 1.0 MB (1 file of unknown size).',
    );
  });

  it('says nothing is downloaded when every file is already stored', () => {
    assert.match(
      describeKeepDownload([{ driveFileId: 'a' }], () => true),
      /nothing is downloaded/,
    );
  });

  it('reports a clean keep, and every kind of problem on a partial one', () => {
    assert.deepEqual(
      getKeepResultAcknowledgment({ failed: 0, kept: 3, tooLarge: 0 }),
      { message: '3 files kept offline.', title: 'Kept offline' },
    );
    assert.deepEqual(
      getKeepResultAcknowledgment({
        failed: 1,
        firstError: 'network',
        kept: 1,
        tooLarge: 1,
      }),
      {
        message:
          '1 file kept offline. 1 file could not be downloaded (network). 1 file did not fit the cache size.',
        title: 'Some files were not kept',
      },
    );
  });
});
