import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPianoSampleCache } from './piano-sample-cache';

const bytesOf = (value: number) => new Uint8Array([value, value]).buffer;

describe('createPianoSampleCache', () => {
  it('fetches each recording once however often it is asked', async () => {
    const fetched: number[] = [];
    const cache = createPianoSampleCache(async (midi) => {
      fetched.push(midi);

      return bytesOf(midi);
    });

    cache.warm([60, 63]);
    await cache.load(60);
    await cache.load(60);
    await cache.load(63);

    assert.deepEqual(fetched, [60, 63]);
  });

  it('hands every caller its own copy, since decoding detaches a buffer', async () => {
    const cache = createPianoSampleCache(async (midi) => bytesOf(midi));
    const first = await cache.load(60);
    const second = await cache.load(60);

    assert.notEqual(first, second);
    assert.deepEqual([...new Uint8Array(second)], [60, 60]);
  });

  it('does not remember a failed fetch, so the next ask tries again', async () => {
    let attempts = 0;
    const cache = createPianoSampleCache(async (midi) => {
      attempts += 1;

      if (attempts === 1) {
        throw new Error('offline');
      }

      return bytesOf(midi);
    });

    await assert.rejects(cache.load(60));
    const bytes = await cache.load(60);

    assert.equal(attempts, 2);
    assert.deepEqual([...new Uint8Array(bytes)], [60, 60]);
  });

  it('leaves a failed warm-up for the later load to report', async () => {
    const cache = createPianoSampleCache(async () => {
      throw new Error('offline');
    });

    assert.doesNotThrow(() => cache.warm([60]));
    await assert.rejects(cache.load(60));
  });
});
