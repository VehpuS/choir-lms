import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PcmSourceError, type PcmFrame } from './pcm-source-types.js';
import { createSharedPcmSource, type PcmEmitter } from './shared-pcm-source.js';

const frame: PcmFrame = {
  samples: new Float32Array(4),
  sampleRate: 44100,
  captureTimeSec: 1,
};

const setup = (options: { failOpen?: boolean; delayOpen?: boolean } = {}) => {
  let opens = 0;
  let closes = 0;
  let emitter: PcmEmitter | null = null;
  let finishOpen = () => undefined as void;
  const source = createSharedPcmSource({
    queryPermission: async () => 'granted',
    open: async (next) => {
      opens += 1;
      emitter = next;

      if (options.delayOpen) {
        await new Promise<void>((resolve) => {
          finishOpen = resolve;
        });
      }
      if (options.failOpen) {
        throw new PcmSourceError('denied');
      }

      return {
        close: () => {
          closes += 1;
        },
      };
    },
  });

  return {
    source,
    counts: () => ({ opens, closes }),
    emitter: () => emitter as unknown as PcmEmitter,
    finishOpen: () => finishOpen(),
  };
};

describe('createSharedPcmSource', () => {
  it('opens one stream for several subscribers and closes after the last leaves', async () => {
    const { source, counts } = setup();
    const leaveFirst = await source.subscribe({ onFrame: () => undefined });
    const leaveSecond = await source.subscribe({ onFrame: () => undefined });

    assert.deepEqual(counts(), { opens: 1, closes: 0 });

    leaveFirst();
    assert.equal(counts().closes, 0);

    leaveSecond();
    assert.deepEqual(counts(), { opens: 1, closes: 1 });
  });

  it('delivers every frame to every subscriber', async () => {
    const { source, emitter } = setup();
    const received: string[] = [];

    await source.subscribe({ onFrame: () => received.push('a') });
    await source.subscribe({ onFrame: () => received.push('b') });
    emitter().frame(frame);

    assert.deepEqual(received, ['a', 'b']);
  });

  it('reopens after everyone has left', async () => {
    const { source, counts } = setup();
    const leave = await source.subscribe({ onFrame: () => undefined });

    leave();
    await source.subscribe({ onFrame: () => undefined });

    assert.deepEqual(counts(), { opens: 2, closes: 1 });
  });

  it('shares one open between subscribers that arrive while it is opening', async () => {
    const { source, counts, finishOpen } = setup({ delayOpen: true });
    const first = source.subscribe({ onFrame: () => undefined });
    const second = source.subscribe({ onFrame: () => undefined });

    finishOpen();
    await Promise.all([first, second]);

    assert.equal(counts().opens, 1);
  });

  it('rejects every waiting subscriber when the microphone cannot open', async () => {
    const { source } = setup({ failOpen: true });

    await assert.rejects(
      source.subscribe({ onFrame: () => undefined }),
      (error: PcmSourceError) => error.reason === 'denied',
    );
  });

  it('closes a stream whose only subscriber left while it was opening', async () => {
    const { source, counts, finishOpen } = setup({ delayOpen: true });
    const pending = source.subscribe({ onFrame: () => undefined });

    finishOpen();
    const leave = await pending;

    leave();
    assert.equal(counts().closes, 1);
  });

  it('tells subscribers when the platform ends the stream, then needs a fresh open', async () => {
    const { source, emitter, counts } = setup();
    let ended = 0;

    await source.subscribe({
      onFrame: () => undefined,
      onEnded: () => {
        ended += 1;
      },
    });
    emitter().ended();
    await source.subscribe({ onFrame: () => undefined });

    assert.equal(ended, 1);
    assert.equal(counts().opens, 2);
  });

  it('relays interruptions and recovery', async () => {
    const { source, emitter } = setup();
    const events: string[] = [];

    await source.subscribe({
      onFrame: () => undefined,
      onInterrupted: () => events.push('interrupted'),
      onRecovered: () => events.push('recovered'),
    });
    emitter().interrupted();
    emitter().recovered();

    assert.deepEqual(events, ['interrupted', 'recovered']);
  });
});
