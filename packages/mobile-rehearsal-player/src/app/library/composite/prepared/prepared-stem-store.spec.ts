import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createPreparedStemStore,
  createUnavailablePreparedStemStore,
  preparedStemId,
} from './prepared-stem-store';
import { createMemoryPreparedStemsBackend } from './prepared-stem-test-support';
import { PreparedStemsUnavailableError } from './prepared-stem-types';
import type { PreparedStemKey } from './prepared-stem-types';

const SAMPLE_RATE = 8000;
const BYTES_PER_SAMPLE = 2;

const key = (overrides: Partial<PreparedStemKey> = {}): PreparedStemKey => ({
  compositeId: 'composite-1',
  stemId: 'stem-1',
  contentVersion: 'v1',
  ...overrides,
});

const setup = () => {
  const memory = createMemoryPreparedStemsBackend();

  return { ...memory, store: createPreparedStemStore(memory.backend) };
};

type Setup = ReturnType<typeof setup>;

const prepare = async (
  t: Setup,
  stemKey: PreparedStemKey,
  chunks: Int16Array[],
) => {
  const writer = await t.store.begin(stemKey, { sampleRate: SAMPLE_RATE });

  for (const chunk of chunks) {
    await writer.write(chunk);
  }

  await writer.finish();
};

describe('prepared stem store', () => {
  it('reads back what was written, across chunk boundaries', async () => {
    const t = setup();

    await prepare(t, key(), [
      Int16Array.of(0, 16384, -16384),
      Int16Array.of(32767),
    ]);

    const reader = await t.store.open(key());

    assert.ok(reader);
    assert.equal(reader.sampleRate, SAMPLE_RATE);
    assert.equal(reader.sampleCount, 4);

    const samples = await reader.read(1, 3);

    assert.equal(samples.length, 3);
    assert.ok(Math.abs(samples[0] - 0.5) < 0.001);
    assert.ok(Math.abs(samples[1] + 0.5) < 0.001);
    assert.ok(samples[2] > 0.999);
  });

  it('cannot read a stem that was never finished', async () => {
    const t = setup();
    const writer = await t.store.begin(key(), { sampleRate: SAMPLE_RATE });

    await writer.write(Int16Array.of(1, 2, 3));

    assert.equal(await t.store.open(key()), null);
    assert.equal(await t.store.has(key()), false);
  });

  it('does not read a stem prepared from another content version', async () => {
    const t = setup();

    await prepare(t, key({ contentVersion: 'v1' }), [Int16Array.of(1, 2)]);

    assert.equal(await t.store.open(key({ contentVersion: 'v2' })), null);
    assert.equal(await t.store.has(key({ contentVersion: 'v1' })), true);
  });

  it('replaces a stem when it is prepared again at a new version', async () => {
    const t = setup();

    await prepare(t, key({ contentVersion: 'v1' }), [
      Int16Array.of(1, 2, 3, 4),
    ]);
    await prepare(t, key({ contentVersion: 'v2' }), [Int16Array.of(9)]);

    assert.equal(await t.store.open(key({ contentVersion: 'v1' })), null);

    const reader = await t.store.open(key({ contentVersion: 'v2' }));

    assert.equal(reader?.sampleCount, 1);
    assert.equal(t.recordIds().length, 1);
    assert.equal(await t.store.sizeBytes(), BYTES_PER_SAMPLE);
  });

  it('keeps nothing readable when a write fails, and the chunk is retried cleanly', async () => {
    const t = setup();
    const writer = await t.store.begin(key(), { sampleRate: SAMPLE_RATE });

    await writer.write(Int16Array.of(1, 2));
    t.failNextAppends(1);
    await assert.rejects(writer.write(Int16Array.of(3, 4)), /Quota/);

    // The failed chunk left no trace, so the same chunk can be written again.
    await writer.write(Int16Array.of(3, 4));
    await writer.finish();

    const reader = await t.store.open(key());

    assert.equal(reader?.sampleCount, 4);
    assert.equal(t.chunkCount(preparedStemId(key())), 2);
  });

  it('leaves a failed stem unreadable and removes it on abort', async () => {
    const t = setup();
    const writer = await t.store.begin(key(), { sampleRate: SAMPLE_RATE });

    t.failNextAppends(1);
    await assert.rejects(writer.write(Int16Array.of(1)));

    assert.equal(await t.store.open(key()), null);

    await writer.abort();

    assert.deepEqual(t.recordIds(), []);
    assert.equal(await t.store.sizeBytes(), 0);
  });

  it('sizes each composite and the whole store', async () => {
    const t = setup();

    await prepare(t, key({ stemId: 'a' }), [Int16Array.of(1, 2, 3)]);
    await prepare(t, key({ stemId: 'b' }), [Int16Array.of(1, 2)]);
    await prepare(t, key({ compositeId: 'composite-2' }), [Int16Array.of(1)]);

    assert.equal(
      await t.store.sizeBytesOfComposite('composite-1'),
      5 * BYTES_PER_SAMPLE,
    );
    assert.equal(await t.store.sizeBytes(), 6 * BYTES_PER_SAMPLE);
  });

  it('lists each composite with its stem count and size', async () => {
    const t = setup();

    await prepare(t, key({ stemId: 'a' }), [Int16Array.of(1, 2, 3)]);
    await prepare(t, key({ stemId: 'b' }), [Int16Array.of(1, 2)]);
    await prepare(t, key({ compositeId: 'composite-2' }), [Int16Array.of(1)]);

    assert.deepEqual(await t.store.listComposites(), [
      {
        compositeId: 'composite-1',
        stemCount: 2,
        sizeBytes: 5 * BYTES_PER_SAMPLE,
      },
      {
        compositeId: 'composite-2',
        stemCount: 1,
        sizeBytes: BYTES_PER_SAMPLE,
      },
    ]);
  });

  it('deletes one composite or everything', async () => {
    const t = setup();

    await prepare(t, key({ stemId: 'a' }), [Int16Array.of(1)]);
    await prepare(t, key({ stemId: 'b' }), [Int16Array.of(1)]);
    await prepare(t, key({ compositeId: 'composite-2' }), [Int16Array.of(1)]);

    await t.store.deleteComposite('composite-1');

    assert.equal(await t.store.has(key({ stemId: 'a' })), false);
    assert.equal(await t.store.has(key({ compositeId: 'composite-2' })), true);

    await t.store.deleteAll();

    assert.deepEqual(t.recordIds(), []);
  });

  it('keeps ids with a separator in them apart', () => {
    assert.notEqual(
      preparedStemId(key({ compositeId: 'a:b', stemId: 'c' })),
      preparedStemId(key({ compositeId: 'a', stemId: 'b:c' })),
    );
  });
});

describe('unavailable prepared stem store', () => {
  it('reads as empty and refuses writes with a clear error', async () => {
    const store = createUnavailablePreparedStemStore();

    assert.equal(await store.open(key()), null);
    assert.equal(await store.sizeBytes(), 0);
    await assert.rejects(
      store.begin(key(), { sampleRate: SAMPLE_RATE }),
      PreparedStemsUnavailableError,
    );
  });

  it('keeps the peaks with a finished stem and reads none for another version', async () => {
    const t = setup();
    const peaks = {
      buckets: Uint8Array.of(10, 200),
      durationMs: 2000,
      formatVersion: 1,
    };
    const writer = await t.store.begin(key(), { sampleRate: SAMPLE_RATE });

    await writer.write(Int16Array.of(1, 2, 3));
    assert.equal(await t.store.getPeaks(key()), null);

    await writer.finish(peaks);

    assert.deepEqual(await t.store.getPeaks(key()), peaks);
    assert.equal(
      await t.store.getPeaks({ ...key(), contentVersion: 'newer' }),
      null,
    );
  });
});
