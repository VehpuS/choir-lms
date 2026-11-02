import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createClickTemplate, renderClickTrain } from '@org/audio-mixing';

import {
  PcmSourceError,
  type PcmBlock,
  type PcmSource,
  type PcmSubscriber,
} from '../../pitch/pcm-source-types.js';
import {
  CLICK_COUNT,
  runClickCalibration,
  type ClickOutput,
} from './click-calibration-run.js';

const SAMPLE_RATE = 16_000;
const CAPTURE_START_WALL_MS = 1000;
const OUTPUT_WALL_MS = 1500;
const CAPTURE_LENGTH_MS = 4000;

type Harness = {
  source: PcmSource;
  output: ClickOutput;
  unsubscribed: () => boolean;
  cancelled: () => boolean;
};

/**
 * A microphone that hears the clicks `latencyMs` after they were handed to the
 * output (or hears nothing, or has no wall clock), delivered as one block once
 * the output has scheduled them.
 */
const createHarness = (options: {
  latencyMs?: number;
  silent?: boolean;
  noClock?: boolean;
  subscribeError?: unknown;
}): Harness => {
  let subscriber: PcmSubscriber | null = null;
  let isUnsubscribed = false;
  let isCancelled = false;

  return {
    unsubscribed: () => isUnsubscribed,
    cancelled: () => isCancelled,
    source: {
      queryPermission: async () => 'granted',
      subscribe: async (next) => {
        if (options.subscribeError) {
          throw options.subscribeError;
        }

        subscriber = next;

        return () => {
          isUnsubscribed = true;
        };
      },
    },
    output: {
      cancel: () => {
        isCancelled = true;
      },
      schedule: async (offsets) => {
        const wallStarts = offsets.map((offset) => OUTPUT_WALL_MS + offset);
        const heardAtMs = wallStarts.map(
          (wall) => wall + (options.latencyMs ?? 0) - CAPTURE_START_WALL_MS,
        );
        const samples = options.silent
          ? new Float32Array((CAPTURE_LENGTH_MS / 1000) * SAMPLE_RATE)
          : renderClickTrain(
              createClickTemplate(SAMPLE_RATE),
              heardAtMs,
              CAPTURE_LENGTH_MS,
              SAMPLE_RATE,
            );
        const block: PcmBlock = {
          samples,
          sampleRate: SAMPLE_RATE,
          startTimeSec: 0,
          ...(options.noClock ? {} : { wallStartMs: CAPTURE_START_WALL_MS }),
        };

        subscriber?.onBlock?.(block);

        return wallStarts;
      },
    },
  };
};

const run = (harness: Harness, signal?: AbortSignal) =>
  runClickCalibration({
    source: harness.source,
    output: harness.output,
    delay: async () => undefined,
    signal,
  });

describe('click calibration run', () => {
  it('measures the round trip the microphone heard', async () => {
    const harness = createHarness({ latencyMs: 74 });
    const outcome = await run(harness);

    assert.equal(outcome.kind, 'measured');
    assert.ok(
      outcome.kind === 'measured' && Math.abs(outcome.latencyMs - 74) <= 1,
      JSON.stringify(outcome),
    );
    assert.equal(CLICK_COUNT, 5);
  });

  it('stops listening and silences the output when it finishes', async () => {
    const harness = createHarness({ latencyMs: 40 });

    await run(harness);

    assert.equal(harness.unsubscribed(), true);
    assert.equal(harness.cancelled(), true);
  });

  it('says the clicks were not heard when the microphone hears nothing', async () => {
    const outcome = await run(createHarness({ silent: true }));

    assert.deepEqual(outcome, { kind: 'failed', reason: 'not-heard' });
  });

  it('fails without a measurement when the capture has no wall clock', async () => {
    const outcome = await run(createHarness({ latencyMs: 60, noClock: true }));

    assert.deepEqual(outcome, { kind: 'failed', reason: 'no-clock' });
  });

  it('reports a denied microphone and never plays', async () => {
    const harness = createHarness({
      subscribeError: new PcmSourceError('denied'),
    });
    const outcome = await run(harness);

    assert.deepEqual(outcome, { kind: 'failed', reason: 'denied' });
    assert.equal(harness.cancelled(), false);
  });

  it('keeps the previous value when cancelled', async () => {
    const harness = createHarness({ latencyMs: 74 });
    const controller = new AbortController();

    controller.abort();

    assert.deepEqual(await run(harness, controller.signal), {
      kind: 'cancelled',
    });
    assert.equal(harness.unsubscribed(), true);
  });
});
