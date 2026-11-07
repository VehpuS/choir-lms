import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SyncTimers } from './sync-controller.ts';
import type { PcmWindowReader } from './wav-window-reader.ts';
import {
  createWindowedVoice,
  type VoiceContext,
  type VoiceGain,
  type VoiceSource,
} from './windowed-voice.ts';

/** A reader at 1 kHz whose every sample is 1, so a fade shows as a value below 1. */
const createReader = (durationMs: number) => {
  const reads: Array<{ start: number; count: number }> = [];
  const reader: PcmWindowReader = {
    sampleRate: 1000,
    sampleCount: durationMs,
    durationMs,
    read: async (start, count) => {
      reads.push({ start, count });

      return new Float32Array(
        Math.max(0, Math.min(count, durationMs - start)),
      ).fill(1);
    },
  };

  return { reader, reads };
};

type Started = {
  when: number;
  offset: number | undefined;
  stoppedAt?: number;
  playbackRate: number;
  samples: Float32Array | null;
};

const createFakeContext = () => {
  const started: Started[] = [];
  const state = { currentTime: 100 };
  const context: VoiceContext = {
    get currentTime() {
      return state.currentTime;
    },
    createBuffer: () => {
      const holder: { data: Float32Array } = { data: new Float32Array(0) };

      return {
        copyToChannel: (data: Float32Array) => {
          holder.data = data;
        },
        holder,
      } as never;
    },
    createGain: (): VoiceGain => ({
      connect: () => undefined,
      gain: {
        value: 1,
        setValueAtTime: () => undefined,
        linearRampToValueAtTime: () => undefined,
      },
    }),
    createBufferSource: (): VoiceSource => {
      const record: Started = {
        when: 0,
        offset: undefined,
        playbackRate: 1,
        samples: null,
      };
      const rate = {
        set value(next: number) {
          record.playbackRate = next;
        },
        get value() {
          return record.playbackRate;
        },
      };

      started.push(record);

      return {
        get buffer() {
          return null;
        },
        set buffer(buffer: unknown) {
          record.samples =
            (buffer as { holder: { data: Float32Array } } | null)?.holder
              .data ?? null;
        },
        playbackRate: rate,
        connect: () => undefined,
        start: (when, offset) => {
          record.when = when;
          record.offset = offset;
        },
        stop: (when) => {
          record.stoppedAt = when;
        },
      } as VoiceSource;
    },
  };

  return {
    context,
    output: { connect: () => undefined },
    started,
    advance: (seconds: number) => (state.currentTime += seconds),
  };
};

const createManualTimers = () => {
  let callback: (() => void) | null = null;
  const timers: SyncTimers = {
    setInterval: (cb) => {
      callback = cb;

      return 1;
    },
    clearInterval: () => {
      callback = null;
    },
  };

  return { timers, tick: () => callback?.() };
};

const settle = () => new Promise((resolve) => setImmediate(resolve));

describe('windowed voice at a rate', () => {
  it('sets the source playback rate and reports the position at that rate', async () => {
    const fake = createFakeContext();
    const voice = createWindowedVoice({
      context: fake.context,
      output: fake.output,
      reader: createReader(70_000).reader,
      rate: 0.7,
      timers: createManualTimers().timers,
    });

    voice.start(1000);
    await settle();
    fake.advance(10);

    assert.equal(fake.started[0]?.playbackRate, 0.7);
    assert.equal(voice.getPositionMs(), 1000 + 10_000 * 0.7);
  });

  it('places the next window at anchor + media distance / rate', async () => {
    const fake = createFakeContext();
    const manual = createManualTimers();
    const voice = createWindowedVoice({
      context: fake.context,
      output: fake.output,
      reader: createReader(70_000).reader,
      rate: 0.5,
      timers: manual.timers,
    });

    voice.start(0);
    await settle();
    // Lookahead is media time: 12 s before the window end is 36 s of media, 72 s of context.
    fake.advance(40);
    manual.tick();
    await settle();

    // 30 s of media at 0.5 takes 60 s of context time.
    assert.equal(fake.started[1]?.when, 160);
    assert.equal(fake.started[1]?.offset, 0);
  });

  it('re-anchors at the current position when the rate changes while playing', async () => {
    const fake = createFakeContext();
    const voice = createWindowedVoice({
      context: fake.context,
      output: fake.output,
      reader: createReader(70_000).reader,
      timers: createManualTimers().timers,
    });

    voice.start(0);
    await settle();
    fake.advance(10);
    voice.setRate(0.5);
    await settle();

    // The first source fades out; the new one starts 10 s in at the new rate.
    assert.equal(fake.started.length, 2);
    assert.ok(fake.started[0]?.stoppedAt !== undefined);
    assert.equal(fake.started[1]?.playbackRate, 0.5);
    assert.equal(fake.started[1]?.offset, 10);
    assert.equal(voice.getPositionMs(), 10_000);

    fake.advance(10);

    assert.equal(voice.getPositionMs(), 15_000);
  });

  it('keeps a rate set while stopped for the next start', async () => {
    const fake = createFakeContext();
    const voice = createWindowedVoice({
      context: fake.context,
      output: fake.output,
      reader: createReader(70_000).reader,
      timers: createManualTimers().timers,
    });

    voice.setRate(1.3);
    voice.start(0);
    await settle();

    assert.equal(fake.started[0]?.playbackRate, 1.3);
  });

  it('starts at a given context time and holds the position until then', async () => {
    const fake = createFakeContext();
    const voice = createWindowedVoice({
      context: fake.context,
      output: fake.output,
      reader: createReader(70_000).reader,
      timers: createManualTimers().timers,
    });

    voice.start(35_000, 100.5);
    await settle();

    assert.equal(fake.started[0]?.when, 100.5);
    assert.equal(fake.started[0]?.offset, 5);
    assert.equal(voice.getPositionMs(), 35_000);

    fake.advance(1.5);

    assert.equal(voice.getPositionMs(), 36_000);
  });
});

describe('windowed voice overlap', () => {
  it('reads the overlap after the body and bakes complementary fades', async () => {
    const fake = createFakeContext();
    const manual = createManualTimers();
    const { reader, reads } = createReader(70_000);
    const voice = createWindowedVoice({
      context: fake.context,
      output: fake.output,
      reader,
      overlapSamples: 64,
      timers: manual.timers,
    });

    voice.start(0);
    await settle();
    fake.advance(20);
    manual.tick();
    await settle();

    assert.deepEqual(reads[0], { start: 0, count: 30_064 });
    assert.deepEqual(reads[1], { start: 30_000, count: 30_064 });

    const first = fake.started[0]?.samples;
    const second = fake.started[1]?.samples;

    assert.ok(first && second);
    // The first window of a run has no head fade; its tail fades out.
    assert.equal(first[0], 1);
    assert.equal(first[29_999], 1);
    assert.ok(first[30_000] < 1 && first[30_063] < first[30_000]);
    // The next window fades its head in, and head + tail sum to the signal.
    for (let index = 0; index < 64; index += 1) {
      assert.ok(Math.abs(first[30_000 + index] + second[index] - 1) < 1e-6);
    }
    assert.equal(second[64], 1);
  });

  it('leaves the last window without a tail fade', async () => {
    const fake = createFakeContext();
    const voice = createWindowedVoice({
      context: fake.context,
      output: fake.output,
      reader: createReader(40_000).reader,
      overlapSamples: 64,
      timers: createManualTimers().timers,
    });

    voice.start(35_000);
    await settle();

    const samples = fake.started[0]?.samples;

    assert.ok(samples);
    assert.equal(samples[samples.length - 1], 1);
  });

  it('adds no overlap by default', async () => {
    const fake = createFakeContext();
    const { reader, reads } = createReader(70_000);
    const voice = createWindowedVoice({
      context: fake.context,
      output: fake.output,
      reader,
      timers: createManualTimers().timers,
    });

    voice.start(0);
    await settle();

    assert.deepEqual(reads, [{ start: 0, count: 30_000 }]);
  });
});
