import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPitchStore } from './pitch-store.js';
import {
  createFakePcmSource,
  createFakeStorage,
  createFakeVisibility,
  settle,
  sineFrames,
} from './pitch-test-support.js';

const setup = () => {
  const source = createFakePcmSource('granted');
  const store = createPitchStore({
    source,
    visibility: createFakeVisibility(true),
    storage: createFakeStorage(),
  });

  store.acquire();

  return { source, store };
};

const listen = async (ctx: ReturnType<typeof setup>) => {
  await ctx.store.requestListen();
  await settle();
};

describe('pitch store: level and cutoff', () => {
  it('publishes the level of every frame, even ones the cutoff rejects, and resets it when listening stops', async () => {
    const ctx = setup();
    let notified = 0;

    ctx.store.subscribeLevel(() => {
      notified += 1;
    });
    await listen(ctx);
    ctx.store.setLevelCutoffDb(-20);
    // Amplitude 0.01 is about -43 dB, below the -20 dB cutoff.
    sineFrames(220, 3, 1, 0.01).forEach((frame) => ctx.source.emit(frame));

    assert.ok(notified > 0);
    assert.ok(ctx.store.getLevelDb() < -40 && ctx.store.getLevelDb() > -50);
    assert.equal(ctx.store.getState().reading.active, false);

    ctx.store.stopListening();

    assert.equal(ctx.store.getLevelDb(), -100);
  });

  it('applies and clamps the cutoff', () => {
    const { store } = setup();

    store.setLevelCutoffDb(-50);
    assert.equal(store.getState().levelCutoffDb, -50);

    store.setLevelCutoffDb(5);
    assert.equal(store.getState().levelCutoffDb, -20);
  });

  it('stops notifying a level listener after it unsubscribes', async () => {
    const ctx = setup();
    let notified = 0;
    const unsubscribe = ctx.store.subscribeLevel(() => {
      notified += 1;
    });

    await listen(ctx);
    unsubscribe();
    sineFrames(220, 2).forEach((frame) => ctx.source.emit(frame));

    assert.equal(notified, 0);
  });
});
