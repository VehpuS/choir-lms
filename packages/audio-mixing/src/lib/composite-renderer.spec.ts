import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CEILING_HEADROOM, CEILING_KNEE } from './mix-limiter.ts';
import {
  renderComposite,
  type CompositeRenderStem,
  type RenderCompositeOptions,
  type SumShaper,
} from './composite-renderer.ts';
import { createReader, OUTPUT_RATE } from './mix-render-test-fakes.ts';

const INT16_MAX = 32_767;
const NO_SHAPING = { rate: 1, pitchSemitones: 0 };

/** Never opened at speed 1 and no pitch change: that case has no shaping stage. */
const unusedShaper: SumShaper = {
  open: async () => {
    throw new Error('an unshaped render must not open a shaping stage');
  },
  sampleRate: OUTPUT_RATE,
};

/**
 * A shaper that plays at the requested speed by picking every `rate`-th input
 * frame, so the sum's length and position are visible in the output. It reads
 * silence once the input has ended, like the real stretcher's flush.
 */
const createDecimatingShaper = () => {
  const events = { closed: 0, opened: 0 };
  const shaper: SumShaper = {
    open: async ({ rate }) => {
      events.opened += 1;

      let inputFrames = 0;
      let pending: number[] = [];

      return {
        available: () => pending.length,
        close: () => {
          events.closed += 1;
        },
        push: (samples) => {
          for (const sample of samples) {
            if (inputFrames % rate === 0) {
              pending.push(sample);
            }

            inputFrames += 1;
          }
        },
        read: (frames) => {
          const out = Float32Array.from(pending.slice(0, frames));

          pending = pending.slice(frames);

          return out;
        },
      };
    },
    sampleRate: OUTPUT_RATE,
  };

  return { events, shaper };
};

const stem = (
  id: string,
  options: {
    sampleCount: number;
    value: (index: number) => number;
    offsetMs?: number;
    gain?: number;
  },
): CompositeRenderStem => ({
  gain: options.gain ?? 1,
  id,
  offsetMs: options.offsetMs ?? 0,
  reader: createReader(options.sampleCount, options.value),
});

const render = async (
  stems: CompositeRenderStem[],
  overrides: Partial<RenderCompositeOptions> = {},
) => {
  const chunks: Int16Array[] = [];
  const result = await renderComposite({
    shaper: unusedShaper,
    shaping: NO_SHAPING,
    stems,
    write: (samples) => {
      chunks.push(samples);
    },
    ...overrides,
  });

  return {
    chunks,
    result,
    samples: Int16Array.from(chunks.flatMap((chunk) => [...chunk])),
  };
};

const level = (samples: Int16Array, index: number) =>
  (samples[index] ?? 0) / INT16_MAX;

describe('renderComposite without shaping', () => {
  it('sums stems by offset and gain into a mono mix as long as the longest stem', async () => {
    const { result, samples } = await render([
      stem('a', { sampleCount: 1000, value: () => 0.2 }),
      stem('b', {
        sampleCount: 1000,
        value: () => 0.3,
        offsetMs: 500,
        gain: 0.5,
      }),
    ]);

    assert.equal(result.status, 'done');
    assert.equal(samples.length, 1500);
    // Below the limiter's knee the level is untouched: 0.2, then 0.2 + 0.15, then 0.15.
    assert.ok(Math.abs(level(samples, 250) - 0.2) < 1e-3);
    assert.ok(Math.abs(level(samples, 750) - 0.35) < 1e-3);
    assert.ok(Math.abs(level(samples, 1250) - 0.15) < 1e-3);
  });

  it('gives the same samples whatever the chunk size', async () => {
    const stems = () => [
      stem('a', { sampleCount: 900, value: (i) => 0.4 * Math.sin(i / 7) }),
      stem('b', {
        sampleCount: 700,
        value: (i) => 0.3 * Math.cos(i / 5),
        offsetMs: 120,
      }),
    ];
    const whole = await render(stems(), { chunkFrames: 5000 });
    const small = await render(stems(), { chunkFrames: 77 });

    assert.deepEqual([...small.samples], [...whole.samples]);
  });

  it('plays a stem with a negative offset from later in its audio', async () => {
    const { samples } = await render([
      stem('a', { sampleCount: 1000, value: (i) => i / 2000, offsetMs: -500 }),
    ]);

    assert.equal(samples.length, 500);
    // Output frame 0 is the stem's sample 500.
    assert.ok(Math.abs(level(samples, 0) - 0.25) < 1e-3);
    assert.ok(Math.abs(level(samples, 100) - 0.3) < 1e-3);
  });

  it('leaves out a stem whose gain is zero (muted or not soloed)', async () => {
    const { samples } = await render([
      stem('a', { sampleCount: 500, value: () => 0.2 }),
      stem('b', { sampleCount: 500, value: () => 0.5, gain: 0 }),
    ]);

    assert.ok(Math.abs(level(samples, 100) - 0.2) < 1e-3);
  });

  it('keeps a loud sum under full scale through the same limiter as the recording export', async () => {
    const loud = Array.from({ length: 9 }, (_, index) =>
      stem(`s${index}`, { sampleCount: 2000, value: () => 0.2 }),
    );
    const { samples } = await render(loud);
    const peak = samples.reduce(
      (max, value) => Math.max(max, Math.abs(value)),
      0,
    );

    // 9 × 0.2 is 1.8 before the limiter; nothing may pass the ceiling.
    assert.ok(peak / INT16_MAX < CEILING_KNEE + CEILING_HEADROOM + 1e-3);
  });

  it('reports progress and the finished length', async () => {
    const progress: Array<[number, number]> = [];
    const { result } = await render(
      [stem('a', { sampleCount: 1000, value: () => 0.1 })],
      {
        chunkFrames: 400,
        onProgress: (done, total) => progress.push([done, total]),
      },
    );

    assert.deepEqual(progress, [
      [400, 1000],
      [800, 1000],
      [1000, 1000],
    ]);
    assert.equal(result.status === 'done' && result.frames, 1000);
    assert.equal(result.status === 'done' && result.channels, 1);
  });

  it('writes nothing for no stems', async () => {
    const { result, samples } = await render([]);

    assert.equal(result.status, 'done');
    assert.equal(samples.length, 0);
  });
});

describe('renderComposite with shaping', () => {
  it('shapes the summed stems, so the render is as long as the sped-up mix', async () => {
    const { events, shaper } = createDecimatingShaper();
    const { result, samples } = await render(
      [stem('a', { sampleCount: 1000, value: (i) => i / 4000 })],
      { shaper, shaping: { rate: 2, pitchSemitones: 0 } },
    );

    assert.equal(result.status, 'done');
    // 1 s of stem at 2× is 0.5 s of output; each output frame is every second input frame.
    assert.equal(samples.length, 500);
    assert.ok(Math.abs(level(samples, 100) - 200 / 4000) < 1e-3);
    assert.equal(events.opened, 1);
    assert.equal(events.closed, 1);
  });

  it('shapes the sum, not each stem: stems are gained and added before the shaper sees them', async () => {
    const { shaper } = createDecimatingShaper();
    const { samples } = await render(
      [
        stem('a', { sampleCount: 1000, value: () => 0.2 }),
        stem('b', { sampleCount: 1000, value: () => 0.2, gain: 1.5 }),
      ],
      { shaper, shaping: { rate: 2, pitchSemitones: 0 } },
    );

    assert.ok(Math.abs(level(samples, 50) - 0.5) < 1e-3);
  });

  it('applies a pitch change at speed 1 through the shaper', async () => {
    const { events, shaper } = createDecimatingShaper();

    await render([stem('a', { sampleCount: 500, value: () => 0.1 })], {
      shaper,
      shaping: { rate: 1, pitchSemitones: 2 },
    });

    assert.equal(events.opened, 1);
  });
});

describe('renderComposite stopping early', () => {
  it('stops when aborted, writing no more and closing the shaping stage', async () => {
    const { events, shaper } = createDecimatingShaper();
    const controller = new AbortController();
    const { chunks, result } = await render(
      [stem('a', { sampleCount: 2000, value: () => 0.1 })],
      {
        chunkFrames: 500,
        shaper,
        shaping: { rate: 2, pitchSemitones: 0 },
        signal: controller.signal,
        write: () => {
          controller.abort();
        },
      },
    );

    assert.equal(result.status, 'aborted');
    assert.equal(chunks.length, 0);
    assert.equal(events.closed, 1);
  });

  it('reports a failed read and closes the shaping stage', async () => {
    const { events, shaper } = createDecimatingShaper();
    const failing: CompositeRenderStem = {
      gain: 1,
      id: 'bad',
      offsetMs: 0,
      reader: {
        ...createReader(1000, () => 0),
        read: async () => {
          throw new Error('stem not readable');
        },
      },
    };
    const { result } = await render([failing], {
      shaper,
      shaping: { rate: 2, pitchSemitones: 0 },
    });

    assert.equal(result.status, 'failed');
    assert.equal(events.closed, 1);
  });
});
