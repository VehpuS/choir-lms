import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

import {
  createPitchStore,
  PITCH_EXPLAINED_KEY,
  PITCH_HEADPHONES_DISMISSED_KEY,
  PITCH_RETRY_MS,
} from './pitch-store.js';
import {
  createFakePcmSource,
  createFakeStorage,
  createFakeVisibility,
  settle,
  sineFrames,
  type FakePcmSource,
} from './pitch-test-support.js';
import type { PcmPermission } from './pcm-source-types.js';

const A4 = 69;

const setup = (
  options: {
    permission?: PcmPermission;
    stored?: Record<string, string>;
    visible?: boolean;
  } = {},
) => {
  const source = createFakePcmSource(options.permission ?? 'prompt');
  const visibility = createFakeVisibility(options.visible ?? true);
  const storage = createFakeStorage(options.stored);
  const store = createPitchStore({ source, visibility, storage });
  const release = store.acquire();

  return { source, visibility, storage, store, release };
};

const listenGranted = async (ctx: ReturnType<typeof setup>) => {
  await ctx.store.requestListen();
  await settle();
};

afterEach(() => {
  mock.timers.reset();
});

describe('pitch store: permission flow', () => {
  it('explains first and asks for the microphone only after confirmation', async () => {
    const { store, source } = setup();

    await store.requestListen();

    assert.equal(store.getState().status, 'explain');
    assert.equal(source.subscribeCalls(), 0);

    await store.confirmExplanation();
    await settle();

    assert.equal(source.subscribeCalls(), 1);
    assert.equal(store.getState().status, 'listening');
  });

  it('never shows the explanation again once accepted', async () => {
    const { store, source, storage } = setup();

    await store.requestListen();
    await store.confirmExplanation();
    await settle();
    store.stopListening();

    assert.equal(storage.entries()[PITCH_EXPLAINED_KEY], 'true');

    source.setPermission('prompt');
    await store.requestListen();
    await settle();

    assert.equal(store.getState().status, 'listening');
  });

  it('skips the explanation when permission is already granted', async () => {
    const ctx = setup({ permission: 'granted' });

    await listenGranted(ctx);

    assert.equal(ctx.store.getState().status, 'listening');
  });

  it('does not touch the microphone until the user presses Listen', async () => {
    const { source, store } = setup();

    await settle();

    assert.equal(source.subscribeCalls(), 0);
    assert.equal(source.permissionQueries(), 0);
    assert.equal(store.getState().status, 'off');
  });

  it('reports a refused permission as blocked and does not retry on its own', async () => {
    const ctx = setup({ permission: 'granted' });

    ctx.source.failNext('denied');
    await listenGranted(ctx);

    assert.equal(ctx.store.getState().status, 'blocked');
    assert.equal(ctx.store.getState().permission, 'denied');

    ctx.visibility.set(false);
    ctx.visibility.set(true);
    await settle();

    assert.equal(ctx.source.subscribeCalls(), 1);
  });

  it('tries again when the user presses Listen after being blocked', async () => {
    const ctx = setup({ permission: 'granted' });

    ctx.source.failNext('denied');
    await listenGranted(ctx);
    await listenGranted(ctx);

    assert.equal(ctx.store.getState().status, 'listening');
  });

  it('tells a busy microphone and a missing one apart from a refusal', async () => {
    for (const [reason, status] of [
      ['in-use', 'in-use'],
      ['unavailable', 'unavailable'],
    ] as const) {
      const ctx = setup({ permission: 'granted' });

      ctx.source.failNext(reason);
      await listenGranted(ctx);

      assert.equal(ctx.store.getState().status, status);
    }
  });
});

describe('pitch store: lifecycle', () => {
  it('listens only while a consumer is mounted', async () => {
    const ctx = setup({ permission: 'granted' });

    ctx.release();
    await listenGranted(ctx);
    assert.equal(ctx.source.subscriberCount(), 0);

    const release = ctx.store.acquire();
    await settle();
    assert.equal(ctx.source.subscriberCount(), 1);

    release();
    assert.equal(ctx.source.subscriberCount(), 0);
    assert.equal(ctx.store.getState().status, 'off');
  });

  it('keeps listening until the last of several consumers unmounts', async () => {
    const ctx = setup({ permission: 'granted' });
    const second = ctx.store.acquire();

    await listenGranted(ctx);
    ctx.release();
    assert.equal(ctx.source.subscriberCount(), 1);

    second();
    assert.equal(ctx.source.subscriberCount(), 0);
  });

  it('stops when the user stops listening', async () => {
    const ctx = setup({ permission: 'granted' });

    await listenGranted(ctx);
    ctx.store.stopListening();

    assert.equal(ctx.source.subscriberCount(), 0);
    assert.equal(ctx.store.getState().status, 'off');
  });

  it('closes a microphone that finished opening after listening was stopped', async () => {
    const ctx = setup({ permission: 'granted' });
    const release = ctx.source.holdNext();

    await ctx.store.requestListen();
    ctx.store.stopListening();
    release();
    await settle();

    assert.equal(ctx.source.subscriberCount(), 0);
    assert.equal(ctx.store.getState().status, 'off');
  });

  it('pauses in the background and resumes without a prompt', async () => {
    const ctx = setup({ permission: 'granted' });

    await listenGranted(ctx);
    ctx.visibility.set(false);

    assert.equal(ctx.store.getState().status, 'paused-hidden');
    assert.equal(ctx.source.subscriberCount(), 0);
    assert.equal(ctx.store.getState().listening, true);

    ctx.visibility.set(true);
    await settle();

    assert.equal(ctx.store.getState().status, 'listening');
    assert.equal(ctx.store.getState().backgroundNoticePending, true);

    ctx.store.dismissBackgroundNotice();
    assert.equal(ctx.store.getState().backgroundNoticePending, false);
  });

  it('does not start capture while the app is hidden', async () => {
    const ctx = setup({ permission: 'granted', visible: false });

    await listenGranted(ctx);

    assert.equal(ctx.source.subscribeCalls(), 0);
    assert.equal(ctx.store.getState().status, 'paused-hidden');
  });
});

describe('pitch store: interruption', () => {
  it('shows an interruption and recovers', async () => {
    const ctx = setup({ permission: 'granted' });

    await listenGranted(ctx);
    ctx.source.interrupt();
    assert.equal(ctx.store.getState().status, 'interrupted');

    ctx.source.recover();
    assert.equal(ctx.store.getState().status, 'listening');
  });

  it('reopens by itself after the platform ends the stream', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    const ctx = setup({ permission: 'granted' });

    await listenGranted(ctx);
    ctx.source.end();
    assert.equal(ctx.store.getState().status, 'interrupted');

    mock.timers.tick(PITCH_RETRY_MS);
    await settle();

    assert.equal(ctx.source.subscribeCalls(), 2);
    assert.equal(ctx.store.getState().status, 'listening');
  });
});

describe('pitch store: headphones note', () => {
  it('raises the note on first listening and not again once dismissed', async () => {
    const ctx = setup({ permission: 'granted' });

    await listenGranted(ctx);
    assert.equal(ctx.store.getState().headphonesNotePending, true);

    ctx.store.dismissHeadphonesNote();
    assert.equal(ctx.store.getState().headphonesNotePending, false);
    assert.equal(ctx.storage.entries()[PITCH_HEADPHONES_DISMISSED_KEY], 'true');

    ctx.store.stopListening();
    await listenGranted(ctx);
    assert.equal(ctx.store.getState().headphonesNotePending, false);
  });

  it('stays quiet when it was dismissed in an earlier session', async () => {
    const ctx = setup({
      permission: 'granted',
      stored: { [PITCH_HEADPHONES_DISMISSED_KEY]: 'true' },
    });

    await listenGranted(ctx);

    assert.equal(ctx.store.getState().headphonesNotePending, false);
  });
});

describe('pitch store: readings', () => {
  const feed = (source: FakePcmSource, hz: number, count: number) => {
    sineFrames(hz, count).forEach((frame) => source.emit(frame));
  };

  it('publishes the sung note while listening', async () => {
    const ctx = setup({ permission: 'granted' });

    await listenGranted(ctx);
    feed(ctx.source, 440, 20);

    const { reading } = ctx.store.getState();

    assert.ok(reading.active);
    assert.equal(reading.midi, A4);
  });

  it('clears the reading when listening stops', async () => {
    const ctx = setup({ permission: 'granted' });

    await listenGranted(ctx);
    feed(ctx.source, 440, 20);
    ctx.store.stopListening();

    assert.equal(ctx.store.getState().reading.active, false);
  });

  it('applies the reference tuning', async () => {
    const ctx = setup({ permission: 'granted' });

    ctx.store.setReferenceHz(432);
    await listenGranted(ctx);
    feed(ctx.source, 432, 20);

    const { reading } = ctx.store.getState();

    assert.ok(reading.active);
    assert.equal(reading.midi, A4);
    assert.ok(Math.abs(reading.cents) < 3);
  });

  it('notifies subscribers of changes and stops after unsubscribe', async () => {
    const ctx = setup({ permission: 'granted' });
    let calls = 0;
    const unsubscribe = ctx.store.subscribe(() => {
      calls += 1;
    });

    await listenGranted(ctx);
    assert.ok(calls > 0);

    unsubscribe();
    const before = calls;
    ctx.store.stopListening();

    assert.equal(calls, before);
  });
});
