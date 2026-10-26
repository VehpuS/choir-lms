import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { keepManyOffline, uniqueSourcesByFile } from './offline-batch.js';

describe('keeping many files offline', () => {
  it('counts kept, not-stored and failed files without stopping at a failure', async () => {
    const result = await keepManyOffline(
      ['a', 'b', 'c', 'd'],
      async (source) => {
        if (source === 'b') {
          throw new Error('network');
        }

        return source === 'c' ? 'not-stored' : 'kept';
      },
    );

    assert.deepEqual(result, {
      failed: 1,
      firstError: 'network',
      kept: 2,
      notStored: 1,
    });
  });

  it('runs no more than the allowed number at once', async () => {
    let running = 0;
    let peak = 0;

    await keepManyOffline(
      ['a', 'b', 'c', 'd', 'e'],
      async () => {
        running += 1;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 1));
        running -= 1;

        return 'kept';
      },
      2,
    );

    assert.equal(peak, 2);
  });

  it('handles an empty batch', async () => {
    assert.deepEqual(await keepManyOffline([], async () => 'kept'), {
      failed: 0,
      kept: 0,
      notStored: 0,
    });
  });

  it('lists each file once, so loops of one track count once', () => {
    const sources = [
      { driveFileId: 'f1', id: 'a' },
      { driveFileId: 'f1', id: 'b' },
      { driveFileId: 'f2', id: 'c' },
    ];

    assert.deepEqual(
      uniqueSourcesByFile(sources).map(({ id }) => id),
      ['a', 'c'],
    );
  });
});
