import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dbToLinear } from '@org/audio-library-models';

import { createReader } from './mix-render-test-fakes.ts';
import {
  NORMALIZE_TARGET_DBFS,
  getNormalizeLevel,
  scanRecordingPeak,
} from './peak-normalize.ts';

const SAMPLES = 100_000;

/** A sine of the given amplitude, so the peak is known. */
const sine = (amplitude: number) =>
  createReader(
    SAMPLES,
    (index) => amplitude * Math.sin((2 * Math.PI * 440 * index) / 44_100),
    44_100,
  );

const peakOf = async (
  reader: ReturnType<typeof createReader>,
  windowSamples?: number,
) => {
  const result = await scanRecordingPeak(reader, { windowSamples });

  assert.equal(result.status, 'done');

  return result.status === 'done' ? result.peak : Number.NaN;
};

describe('scanRecordingPeak', () => {
  it('finds the loudest sample of a sine', async () => {
    assert.ok(Math.abs((await peakOf(sine(0.25))) - 0.25) < 1e-3);
  });

  it('finds a single loud sample in the last, partial window', async () => {
    const reader = createReader(
      SAMPLES,
      (index) => (index === SAMPLES - 1 ? -0.7 : 0.01),
      44_100,
    );

    // The reader hands out 32-bit floats, so 0.7 comes back a hair off.
    assert.ok(Math.abs((await peakOf(reader, 30_000)) - 0.7) < 1e-6);
  });

  it('gives the same peak whatever the window size', async () => {
    const reader = sine(0.4);

    assert.equal(await peakOf(reader, 1), await peakOf(reader, 7_777));
    assert.equal(await peakOf(reader, 1_000_000), await peakOf(reader, 512));
  });

  it('reads silence and an empty recording as a peak of 0', async () => {
    assert.equal(await peakOf(createReader(SAMPLES, () => 0)), 0);
    assert.equal(await peakOf(createReader(0, () => 0)), 0);
  });

  it('reads one window at a time, never the whole recording at once', async () => {
    const sizes: number[] = [];
    const reader = createReader(SAMPLES, () => 0.1);
    const spy = {
      ...reader,
      read: async (start: number, count: number) => {
        sizes.push(count);

        return reader.read(start, count);
      },
    };

    await scanRecordingPeak(spy, { windowSamples: 20_000 });

    assert.deepEqual(sizes, [20_000, 20_000, 20_000, 20_000, 20_000]);
  });

  it('stops between windows once aborted', async () => {
    const signal = { aborted: false };
    const reader = createReader(SAMPLES, () => 0.1);
    let reads = 0;
    const spy = {
      ...reader,
      read: async (start: number, count: number) => {
        reads += 1;
        signal.aborted = true;

        return reader.read(start, count);
      },
    };
    const result = await scanRecordingPeak(spy, {
      signal,
      windowSamples: 1000,
    });

    assert.equal(result.status, 'aborted');
    assert.equal(reads, 1);
  });
});

describe('getNormalizeLevel', () => {
  const levelFor = (peak: number) => {
    const result = getNormalizeLevel(peak);

    assert.equal(result.status, 'level');

    return result.status === 'level'
      ? result
      : { levelDb: Number.NaN, reachedTarget: false, status: 'level' as const };
  };

  it('has nothing to do for silence', () => {
    assert.equal(getNormalizeLevel(0).status, 'silent');
    assert.equal(getNormalizeLevel(Number.NaN).status, 'silent');
  });

  it('raises a quiet recording so its peak lands at -1 dBFS', () => {
    const { levelDb, reachedTarget } = levelFor(0.5);

    assert.equal(levelDb, 5);
    assert.equal(reachedTarget, true);
    assert.ok(
      Math.abs(0.5 * dbToLinear(levelDb) - dbToLinear(NORMALIZE_TARGET_DBFS)) <
        0.01,
    );
  });

  it('never leaves the peak above the target, whatever the rounding', () => {
    for (const peak of [0.013, 0.07, 0.2, 0.333, 0.61, 0.8, 0.95]) {
      const { levelDb, reachedTarget } = levelFor(peak);

      if (reachedTarget) {
        assert.ok(
          peak * dbToLinear(levelDb) <=
            dbToLinear(NORMALIZE_TARGET_DBFS) + 1e-9,
          `peak ${peak}`,
        );
      }
    }
  });

  it('lowers a clipped recording by the 1 dB headroom', () => {
    assert.deepEqual(levelFor(1), {
      levelDb: -1,
      reachedTarget: true,
      status: 'level',
    });
  });

  it('stops at +18 dB and says the target was not reached for a very quiet one', () => {
    const quiet = levelFor(0.01);

    assert.equal(quiet.levelDb, 18);
    assert.equal(quiet.reachedTarget, false);
  });

  it('works end to end from a scan of a quiet recording', async () => {
    const peak = await peakOf(sine(0.1));

    assert.equal(levelFor(peak).levelDb, 18);
    assert.equal(levelFor(await peakOf(sine(0.45))).levelDb, 5.9);
  });
});
