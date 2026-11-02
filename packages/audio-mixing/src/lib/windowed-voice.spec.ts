import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createWindowedVoice,
  type VoiceContext,
  type VoiceGain,
  type VoiceSource,
} from './windowed-voice.ts';
import type { PcmWindowReader } from './wav-window-reader.ts';
import type { SyncTimers } from './sync-controller.ts';

/** A reader at 1 kHz, so one sample is one millisecond. */
const createReader = (durationMs: number, failAtSample?: number) => {
  const reads: Array<{ start: number; count: number }> = [];
  const reader: PcmWindowReader = {
    sampleRate: 1000,
    sampleCount: durationMs,
    durationMs,
    read: async (start, count) => {
      reads.push({ start, count });

      if (failAtSample !== undefined && start >= failAtSample) {
        throw new Error('missing chunk');
      }

      return new Float32Array(Math.max(0, Math.min(count, durationMs - start)));
    },
  };

  return { reader, reads };
};

type StartedSource = {
  when: number;
  offset: number | undefined;
  stoppedAt?: number;
  gainRamps: Array<[number, number]>;
};

const createFakeContext = () => {
  const started: StartedSource[] = [];
  const state = { currentTime: 100 };
  const output = { connect: () => undefined };
  const context: VoiceContext = {
    get currentTime() {
      return state.currentTime;
    },
    createBuffer: () => ({ copyToChannel: () => undefined }),
    createGain: (): VoiceGain => ({
      connect: () => undefined,
      gain: {
        value: 1,
        setValueAtTime: () => undefined,
        linearRampToValueAtTime: () => undefined,
      },
    }),
    createBufferSource: (): VoiceSource => {
      const record: StartedSource = {
        when: 0,
        offset: undefined,
        gainRamps: [],
      };

      started.push(record);

      return {
        buffer: null,
        connect: () => undefined,
        start: (when, offset) => {
          record.when = when;
          record.offset = offset;
        },
        stop: (when) => {
          record.stoppedAt = when;
        },
      };
    },
  };

  return {
    context,
    output,
    started,
    advance: (s: number) => (state.currentTime += s),
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

  return {
    timers,
    tick: () => callback?.(),
    isRunning: () => callback !== null,
  };
};

const settle = () => new Promise((resolve) => setImmediate(resolve));

describe('windowed voice', () => {
  it('reads only the window around the start and plays part-way into it', async () => {
    const fake = createFakeContext();
    const { reader, reads } = createReader(70_000);
    const voice = createWindowedVoice({
      context: fake.context,
      output: fake.output,
      reader,
      timers: createManualTimers().timers,
    });

    voice.start(35_000);
    await settle();

    // The window is 30 s from 30 s on; the recording is not read from its start.
    assert.deepEqual(reads, [{ start: 30_000, count: 30_000 }]);
    assert.equal(fake.started.length, 1);
    assert.equal(fake.started[0]?.when, 100);
    assert.equal(fake.started[0]?.offset, 5);
  });

  it('reports where it is from the context clock, and null once stopped', async () => {
    const fake = createFakeContext();
    const voice = createWindowedVoice({
      context: fake.context,
      output: fake.output,
      reader: createReader(70_000).reader,
      timers: createManualTimers().timers,
    });

    assert.equal(voice.getPositionMs(), null);

    voice.start(1000);
    await settle();
    fake.advance(2);

    assert.equal(voice.getPositionMs(), 3000);

    voice.stop();

    assert.equal(voice.getPositionMs(), null);
  });

  it('reads the next window ahead of the playhead and places it seamlessly', async () => {
    const fake = createFakeContext();
    const manual = createManualTimers();
    const { reader, reads } = createReader(70_000);
    const voice = createWindowedVoice({
      context: fake.context,
      output: fake.output,
      reader,
      timers: manual.timers,
    });

    voice.start(0);
    await settle();
    manual.tick();
    await settle();

    // Far from the end of the first window: nothing more is read yet.
    assert.equal(reads.length, 1);

    fake.advance(20);
    manual.tick();
    await settle();

    // Within the lookahead of the window's end: the next window is read.
    assert.deepEqual(reads[1], { start: 30_000, count: 30_000 });
    // It starts exactly where the first window ends on the context clock.
    assert.equal(fake.started[1]?.when, 130);
    assert.equal(fake.started[1]?.offset, 0);
  });

  it('does not read a window twice while one is still loading', async () => {
    const fake = createFakeContext();
    const manual = createManualTimers();
    const { reader, reads } = createReader(70_000);
    const voice = createWindowedVoice({
      context: fake.context,
      output: fake.output,
      reader,
      timers: manual.timers,
    });

    voice.start(0);
    await settle();
    fake.advance(25);
    manual.tick();
    manual.tick();
    await settle();

    assert.equal(reads.length, 2);
  });

  it('stops the old sound and starts the new position when restarted', async () => {
    const fake = createFakeContext();
    const voice = createWindowedVoice({
      context: fake.context,
      output: fake.output,
      reader: createReader(70_000).reader,
      timers: createManualTimers().timers,
    });

    voice.start(1000);
    await settle();
    fake.advance(1);
    voice.start(8000);
    await settle();

    assert.equal(fake.started.length, 2);
    // The first source fades out and stops shortly after the restart.
    assert.ok((fake.started[0]?.stoppedAt ?? 0) > 101);
    assert.equal(fake.started[1]?.offset, 8);
  });

  it('is silent past the end of the recording', async () => {
    const fake = createFakeContext();
    const voice = createWindowedVoice({
      context: fake.context,
      output: fake.output,
      reader: createReader(5000).reader,
      timers: createManualTimers().timers,
    });

    voice.start(4000);
    await settle();
    fake.advance(2);

    assert.equal(voice.getPositionMs(), null);
  });

  it('reports a missing window once and stops trying', async () => {
    const fake = createFakeContext();
    const errors: unknown[] = [];
    const voice = createWindowedVoice({
      context: fake.context,
      output: fake.output,
      reader: createReader(70_000, 0).reader,
      timers: createManualTimers().timers,
      onUnavailable: (error) => errors.push(error),
    });

    voice.start(0);
    await settle();
    voice.start(500);
    await settle();

    assert.equal(errors.length, 1);
    assert.equal(fake.started.length, 0);
  });

  it('stops the pump and the sound when disposed', async () => {
    const fake = createFakeContext();
    const manual = createManualTimers();
    const voice = createWindowedVoice({
      context: fake.context,
      output: fake.output,
      reader: createReader(70_000).reader,
      timers: manual.timers,
    });

    voice.start(0);
    await settle();
    voice.dispose();

    assert.equal(manual.isRunning(), false);
    assert.equal(fake.started[0]?.stoppedAt, 100);
    assert.equal(voice.getPositionMs(), null);
  });
});
