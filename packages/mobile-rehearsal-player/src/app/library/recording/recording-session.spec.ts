import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { settle } from '../pitch/pitch-test-support.js';
import { RECORDING_EXPLAINED_KEY } from './recording-session.js';
import { request, setup } from './recording-session-test-support.js';

describe('recording session', () => {
  it('records on the first request when the explanation was already accepted', async () => {
    const t = setup();

    await t.session.requestStart(async () => request());

    assert.equal(t.session.getState().phase, 'recording');
    assert.equal(t.source.subscriberCount(), 1);
  });

  it('explains first and opens no microphone until Continue, then records', async () => {
    const t = setup({ explained: false });
    let built = 0;

    await t.session.requestStart(async () => {
      built += 1;

      return request();
    });

    assert.equal(t.session.getState().phase, 'explain');
    assert.equal(t.source.subscribeCalls(), 0);
    assert.equal(built, 0);

    await t.session.confirmExplanation();

    assert.equal(t.session.getState().phase, 'recording');
    assert.equal(built, 1);
    assert.equal(t.flags.values[RECORDING_EXPLAINED_KEY], 'true');
  });

  it('goes back to ready on Not now and asks again next time', async () => {
    const t = setup({ explained: false });

    await t.session.requestStart(async () => request());
    t.session.dismiss();

    assert.equal(t.session.getState().phase, 'idle');
    assert.equal(t.flags.values[RECORDING_EXPLAINED_KEY], undefined);
  });

  it('shows a blocked state with the reason when the microphone is denied', async () => {
    const t = setup();

    t.source.failNext('denied');
    await t.session.requestStart(async () => request());

    assert.equal(t.session.getState().phase, 'blocked');
    assert.equal(t.session.getState().blockedReason, 'denied');
  });

  it('refuses without opening the microphone when storage is nearly full', async () => {
    const t = setup({ estimate: { quota: 60e6, usage: 5e6 } });

    await t.session.requestStart(async () => request());

    assert.equal(t.session.getState().phase, 'refused');
    assert.equal(t.source.subscribeCalls(), 0);
  });

  it('counts elapsed time, then stops by hand into a saved recording and a message', async () => {
    const t = setup();

    await t.session.requestStart(async () => request());
    t.feed(25); // 2.5 s
    await settle();

    assert.ok(t.session.getState().elapsedMs >= 2000);

    await t.session.stop();
    const state = t.session.getState();

    assert.equal(state.phase, 'stopped');
    assert.equal(state.savedRecording?.id, 'rec-1');
    assert.equal(state.savedRecording?.durationMs, 2500);
    assert.equal((await t.store.list()).length, 1);
    assert.equal(state.stopMessage?.isProblem, false);
  });

  it('turns a stop the recorder saw itself into the stopped state with its reason', async () => {
    const t = setup();

    await t.session.requestStart(async () => request());
    t.feed(25);
    await settle();
    t.visibility.set(false);
    await settle();

    const state = t.session.getState();

    assert.equal(state.phase, 'stopped');
    assert.match(state.stopMessage?.message ?? '', /background/);
  });

  it('says nothing was saved for a take that was too short', async () => {
    const t = setup();

    await t.session.requestStart(async () => request());
    t.feed(2);
    await t.session.stop();

    assert.match(t.session.getState().stopMessage?.message ?? '', /too short/);
    assert.equal(t.session.getState().savedRecording, undefined);
  });

  it('shows the time left in the ready state only when space is low', async () => {
    const plenty = setup();
    const low = setup({
      estimate: { quota: 50e6 + 96_000 * 60 * 20, usage: 0 },
    });

    await plenty.session.refreshStorage();
    await low.session.refreshStorage();

    assert.equal(plenty.session.getState().timeLeft, null);
    assert.equal(low.session.getState().timeLeft?.tone, 'normal');
  });

  it('saves a recording started mid-track and stopped by hand with the span it covered', async () => {
    const t = setup();
    const position = 90_000;
    let listeners = 0;

    await t.session.requestStart(async () => ({
      ...request(),
      getTimeline: (elapsedMs) => [
        {
          recordingStartMs: 0,
          recordingEndMs: elapsedMs,
          trackStartMs: position,
          held: false,
        },
      ],
      dispose: () => {
        listeners -= 1;
      },
    }));
    listeners += 1;
    t.feed(25); // 2.5 s
    await t.session.stop();

    const saved = t.session.getState().savedRecording;

    assert.deepEqual(saved?.timeline, [
      {
        recordingStartMs: 0,
        recordingEndMs: 2500,
        trackStartMs: position,
        held: false,
      },
    ]);
    // Stopping releases the request but never touches the track.
    assert.equal(listeners, 0);
    assert.equal(position, 90_000);
  });

  it('anchors the request to the first sample and releases it when the recording ends', async () => {
    const t = setup();
    const events: string[] = [];

    await t.session.requestStart(async () => ({
      ...request(),
      onCaptureStart: (wallMs) => events.push(`origin ${wallMs}`),
      dispose: () => events.push('dispose'),
    }));
    t.source.emitBlock({
      samples: new Float32Array(4800).fill(0.25),
      sampleRate: 48_000,
      startTimeSec: 1,
      wallStartMs: 42,
    });
    await t.session.stop();

    assert.deepEqual(events, ['origin 42', 'dispose']);
  });

  it('releases the request when the microphone cannot be opened', async () => {
    const t = setup();
    let disposed = 0;

    t.source.failNext('denied');
    await t.session.requestStart(async () => ({
      ...request(),
      dispose: () => {
        disposed += 1;
      },
    }));

    assert.equal(disposed, 1);
  });

  it('ignores a second start while already recording', async () => {
    const t = setup();

    await t.session.requestStart(async () => request());
    await t.session.requestStart(async () => request());

    assert.equal(t.source.subscribeCalls(), 1);
  });

  describe('afterExplanation', () => {
    it('proceeds at once when the explanation was already accepted', async () => {
      const t = setup();
      let proceeded = 0;

      await t.session.afterExplanation(() => {
        proceeded += 1;
      });

      assert.equal(proceeded, 1);
      assert.equal(t.session.getState().phase, 'idle');
    });

    it('explains first, and proceeds only after Continue', async () => {
      const t = setup({ explained: false });
      let proceeded = 0;

      await t.session.afterExplanation(() => {
        proceeded += 1;
      });

      assert.equal(t.session.getState().phase, 'explain');
      assert.equal(proceeded, 0);

      await t.session.confirmExplanation();

      assert.equal(proceeded, 1);
      assert.equal(t.session.getState().phase, 'idle');
      assert.equal(t.source.subscribeCalls(), 0);
    });

    it('drops what was waiting when the explanation is dismissed', async () => {
      const t = setup({ explained: false });
      let proceeded = 0;

      await t.session.afterExplanation(() => {
        proceeded += 1;
      });
      t.session.dismiss();
      await t.session.confirmExplanation();

      assert.equal(proceeded, 0);
    });
  });

  it('says a take ended by a punch range stopped at the end of the range', async () => {
    const t = setup();

    await t.session.requestStart(async () => request());
    t.feed(25);
    await t.session.stop('out-point');

    const { stopMessage } = t.session.getState();

    assert.match(stopMessage?.message ?? '', /end of the range/);
  });
});
