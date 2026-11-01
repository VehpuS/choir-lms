import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { settle } from '../pitch/pitch-test-support.js';
import {
  createHandTransport,
  request,
  setup,
} from './recording-session-test-support.js';

describe('recording session', () => {
  it('arms while the track is stopped, keeps nothing, and starts when it plays', async () => {
    const t = setup();
    const track = createHandTransport(false);

    await t.session.requestStart(async () => ({
      ...request(),
      transport: track.transport,
    }));
    t.feed(10);
    await settle();

    assert.equal(t.session.getState().phase, 'armed');
    assert.equal(t.session.getState().elapsedMs, 0);
    assert.equal(t.source.subscriberCount(), 1);

    track.set(true);
    t.feed(25); // 2.5 s
    await settle();

    assert.equal(t.session.getState().phase, 'recording');

    await t.session.stop();

    assert.equal(t.session.getState().savedRecording?.durationMs, 2500);
    assert.equal(track.listenerCount(), 0);
  });

  it('starts at once when the track is already playing', async () => {
    const t = setup();
    const track = createHandTransport(true);

    await t.session.requestStart(async () => ({
      ...request(),
      transport: track.transport,
    }));

    assert.equal(t.session.getState().phase, 'recording');
  });

  it('pauses the take with the track and continues the same take on resume', async () => {
    const t = setup();
    const track = createHandTransport(true);

    await t.session.requestStart(async () => ({
      ...request(),
      transport: track.transport,
    }));
    t.feed(15); // 1.5 s
    track.set(false);
    t.feed(30); // dropped
    await settle();

    assert.equal(t.session.getState().paused, true);

    track.set(true);
    t.feed(10); // 1 s
    await t.session.stop();

    assert.equal(t.session.getState().savedRecording?.durationMs, 2500);
  });

  it('disarms without a message when stopped before the track plays', async () => {
    const t = setup();
    const track = createHandTransport(false);

    await t.session.requestStart(async () => ({
      ...request(),
      transport: track.transport,
    }));
    await t.session.stop();

    assert.equal(t.session.getState().phase, 'idle');
    assert.equal(t.session.getState().stopMessage, undefined);
    assert.equal((await t.store.list()).length, 0);
    assert.equal(track.listenerCount(), 0);
  });
});
