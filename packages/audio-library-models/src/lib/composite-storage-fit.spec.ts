import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  checkCompositeStorageFit,
  estimateCompositeBytesNeeded,
  estimatePreparedStemBytes,
  type StorageEstimator,
} from './composite-storage-fit.ts';

const RATE = 48_000;
const THREE_MINUTES_MS = 180_000;
const MB = 1024 * 1024;
const estimator = (
  reading: { quota?: number; usage?: number } | undefined,
): StorageEstimator => ({
  estimate: async () => reading,
});

describe('estimatePreparedStemBytes', () => {
  it('is duration × rate × 2 bytes × channels', () => {
    assert.equal(
      estimatePreparedStemBytes({ durationMs: 1000, channels: 2 }, RATE),
      RATE * 2 * 2,
    );
    assert.equal(
      estimatePreparedStemBytes({ durationMs: 1000, channels: 1 }, RATE),
      RATE * 2,
    );
  });

  it('counts a stem whose channels are not known yet as stereo', () => {
    assert.equal(
      estimatePreparedStemBytes({ durationMs: THREE_MINUTES_MS }, RATE),
      THREE_MINUTES_MS * 2 * 2 * (RATE / 1000),
    );
  });

  it('is zero for no duration', () => {
    assert.equal(estimatePreparedStemBytes({ durationMs: 0 }, RATE), 0);
    assert.equal(estimatePreparedStemBytes({ durationMs: 1000 }, 0), 0);
  });
});

describe('estimateCompositeBytesNeeded', () => {
  it('sums the stems and skips those already prepared', () => {
    const stems = [
      { durationMs: 1000, channels: 2 as const },
      { durationMs: 1000, channels: 1 as const },
      { durationMs: 1000, channels: 2 as const, prepared: true },
    ];

    assert.equal(estimateCompositeBytesNeeded(stems, RATE), RATE * 2 * 3);
  });
});

describe('checkCompositeStorageFit', () => {
  const stems = [
    { durationMs: THREE_MINUTES_MS, channels: 2 as const },
    { durationMs: THREE_MINUTES_MS, channels: 1 as const },
  ];

  it('fits when the room left covers the bytes needed', async () => {
    const result = await checkCompositeStorageFit(
      stems,
      RATE,
      estimator({ quota: 1000 * MB, usage: 100 * MB }),
    );

    assert.equal(result.fit, 'fits');
    assert.equal(result.bytesAvailable, 900 * MB);
  });

  it('does not fit when usage leaves too little', async () => {
    const result = await checkCompositeStorageFit(
      stems,
      RATE,
      estimator({ quota: 60 * MB, usage: 50 * MB }),
    );

    assert.equal(result.fit, 'does-not-fit');
    assert.ok(result.bytesNeeded > (result.bytesAvailable ?? 0));
  });

  it('is unknown without a signal: no estimator, a throw, no data or no quota', async () => {
    const throwing: StorageEstimator = {
      estimate: async () => {
        throw new Error('denied');
      },
    };

    for (const source of [
      undefined,
      throwing,
      estimator(undefined),
      estimator({ usage: 5 }),
      estimator({ quota: Number.NaN }),
    ]) {
      const result = await checkCompositeStorageFit(stems, RATE, source);

      assert.equal(result.fit, 'unknown');
      assert.equal(result.bytesAvailable, undefined);
      assert.ok(result.bytesNeeded > 0);
    }
  });

  it('treats a missing usage as zero and a usage over quota as no room', async () => {
    assert.equal(
      (
        await checkCompositeStorageFit(
          stems,
          RATE,
          estimator({ quota: 1000 * MB }),
        )
      ).fit,
      'fits',
    );
    assert.equal(
      (
        await checkCompositeStorageFit(
          stems,
          RATE,
          estimator({ quota: 10, usage: 20 }),
        )
      ).fit,
      'does-not-fit',
    );
  });

  it('fits when every stem is already prepared, without asking the browser', async () => {
    const result = await checkCompositeStorageFit(
      stems.map((stem) => ({ ...stem, prepared: true })),
      RATE,
      undefined,
    );

    assert.equal(result.fit, 'fits');
    assert.equal(result.bytesNeeded, 0);
  });
});
