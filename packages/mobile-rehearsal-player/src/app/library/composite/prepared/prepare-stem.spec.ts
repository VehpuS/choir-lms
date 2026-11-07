import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isSavedTrackDownloadAbortError } from '../../playback/utils/saved-track-blob-download';
import { prepareStem } from './prepare-stem';
import { mixDownToMono, resampleLinear } from './prepare-stem-signal';
import type { DecodedStem } from './prepare-stem-signal';
import { createPreparedStemStore } from './prepared-stem-store';
import { createMemoryPreparedStemsBackend } from './prepared-stem-test-support';
import type { PreparedStemKey } from './prepared-stem-types';

const RATE = 8000;
const key: PreparedStemKey = {
  compositeId: 'c1',
  stemId: 's1',
  contentVersion: 'v1',
};

const sine = (length: number, frequency: number, rate: number) =>
  Float32Array.from(
    { length },
    (_, index) => Math.sin((2 * Math.PI * frequency * index) / rate) * 0.5,
  );

const setup = () => {
  const memory = createMemoryPreparedStemsBackend();

  return { ...memory, store: createPreparedStemStore(memory.backend) };
};

const prepare = (
  t: ReturnType<typeof setup>,
  decoded: DecodedStem,
  extra: Partial<Parameters<typeof prepareStem>[0]> = {},
) =>
  prepareStem({
    store: t.store,
    key,
    targetSampleRate: RATE,
    decode: async () => decoded,
    yieldToEventLoop: async () => undefined,
    ...extra,
  });

describe('mixDownToMono', () => {
  it('averages the channels', () => {
    const mono = mixDownToMono([
      Float32Array.of(1, 0.5, -1),
      Float32Array.of(0, 0.5, 1),
    ]);

    assert.deepEqual(Array.from(mono), [0.5, 0.5, 0]);
  });

  it('returns a mono stem as it is and nothing for no channels', () => {
    const only = Float32Array.of(0.1, 0.2);

    assert.equal(mixDownToMono([only]), only);
    assert.equal(mixDownToMono([]).length, 0);
  });
});

describe('resampleLinear', () => {
  it('keeps the duration when the rate changes', () => {
    const input = sine(4000, 100, 4000);

    assert.equal(resampleLinear(input, 4000, 8000).length, 8000);
    assert.equal(resampleLinear(input, 4000, 2000).length, 2000);
  });

  it('interpolates between samples and leaves an equal rate alone', () => {
    const input = Float32Array.of(0, 1);

    assert.equal(resampleLinear(input, 8000, 8000), input);
    assert.deepEqual(Array.from(resampleLinear(input, 1, 2)), [0, 0.5, 1, 1]);
  });
});

describe('prepareStem', () => {
  it('stores a mono stem and reports full progress', async () => {
    const t = setup();
    const progress: number[] = [];
    const summary = await prepare(
      t,
      { channels: [sine(20_000, 200, RATE)], sampleRate: RATE },
      { chunkSamples: 8000, onProgress: (value) => progress.push(value) },
    );
    const reader = await t.store.open(key);

    assert.equal(summary.sampleCount, 20_000);
    assert.equal(summary.durationMs, 2500);
    assert.equal(reader?.sampleCount, 20_000);
    assert.equal(t.chunkCount('c1:s1'), 3);
    assert.deepEqual(progress, [0, 0.4, 0.8, 1, 1]);
    assert.ok(summary.peaks);
  });

  it('mixes a stereo stem down to one channel', async () => {
    const t = setup();

    await prepare(t, {
      channels: [
        Float32Array.from({ length: 100 }, () => 0.5),
        Float32Array.from({ length: 100 }, () => -0.5),
      ],
      sampleRate: RATE,
    });

    const samples = await (await t.store.open(key))?.read(0, 100);

    assert.ok(samples);
    assert.ok(samples.every((sample) => Math.abs(sample) < 0.001));
  });

  it('stores a stem decoded at another rate at the context rate', async () => {
    const t = setup();
    const summary = await prepare(t, {
      channels: [sine(4000, 100, 4000)],
      sampleRate: 4000,
    });
    const reader = await t.store.open(key);

    assert.equal(summary.sampleCount, 8000);
    assert.equal(reader?.sampleRate, RATE);
    assert.equal(reader?.durationMs, 1000);
  });

  it('removes the stem when a write fails, and reports why', async () => {
    const t = setup();

    t.failNextAppends(1);
    await assert.rejects(
      prepare(t, { channels: [sine(100, 100, RATE)], sampleRate: RATE }),
      /Quota/,
    );

    assert.deepEqual(t.recordIds(), []);
  });

  it('stops without keeping anything when superseded while writing', async () => {
    const t = setup();
    const controller = new AbortController();

    await assert.rejects(
      prepare(
        t,
        { channels: [sine(20_000, 100, RATE)], sampleRate: RATE },
        {
          chunkSamples: 8000,
          signal: controller.signal,
          onProgress: (fraction) => {
            if (fraction > 0 && fraction < 1) {
              controller.abort();
            }
          },
        },
      ),
      isSavedTrackDownloadAbortError,
    );

    assert.deepEqual(t.recordIds(), []);
    assert.equal(await t.store.has(key), false);
  });

  it('does not decode when already superseded', async () => {
    const t = setup();
    const controller = new AbortController();
    let decodes = 0;

    controller.abort();
    await assert.rejects(
      prepare(
        t,
        { channels: [], sampleRate: RATE },
        {
          signal: controller.signal,
          decode: async () => {
            decodes += 1;

            return { channels: [], sampleRate: RATE };
          },
        },
      ),
      isSavedTrackDownloadAbortError,
    );
    assert.equal(decodes, 0);
  });

  it('refuses a stem with no audio', async () => {
    const t = setup();

    await assert.rejects(
      prepare(t, { channels: [new Float32Array(0)], sampleRate: RATE }),
      /no audio/,
    );
    assert.deepEqual(t.recordIds(), []);
  });
});
